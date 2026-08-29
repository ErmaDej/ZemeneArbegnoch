-- Fix: build_sniper_targets returned x=null, y=null for every target because
-- v_order was 0-based (generate_series(0,...)) but PostgreSQL arrays are 1-based,
-- so v_order[0] was always NULL.  Additionally, the JSONB access
--   v_lanes->(v_order[0])->0
-- failed because -> expects text keys, not integer expressions.
-- Fix: shift indices to 1-based and use #> for nested JSONB access.

create or replace function private_game.build_sniper_targets(
  p_seed bigint,
  p_difficulty int
) returns jsonb language plpgsql immutable as $$
declare
  v_state bigint := p_seed % 2147483647;
  v_rnd double precision;
  v_waves int;
  v_per_wave int;
  v_lanes jsonb := '[[18,28],[48,42],[82,32],[26,62],[74,58],[50,18],[34,76],[66,70],[24,46],[78,48]]'::jsonb;
  v_lane_count int := 10;
  v_targets jsonb := '[]'::jsonb;
  v_i int := 0;
  v_j int;
  v_order int[];
  v_tmp int;
  v_swap_idx int;
  v_spawn_ms int;
  v_tier text;
  v_lifetime int;
  v_value int;
  v_gap_base int;
  v_total int;
  v_lane_idx int;
begin
  v_waves := 3 + case when p_difficulty >= 4 then 1 else 0 end + case when p_difficulty >= 7 then 1 else 0 end;
  v_per_wave := 4 + least(2, p_difficulty / 3);
  v_total := v_waves * v_per_wave;
  v_gap_base := 3600 - least(900, p_difficulty * 110);

  for v_i in 0..(v_total - 1) loop
    -- Shuffle of lane indices per target slot (seeded).
    -- Use 1-based indices to match PostgreSQL array convention.
    v_order := array(select g from generate_series(1, v_lane_count) g);
    for v_j in reverse v_lane_count - 1..1 loop
      v_state := private_game.lcg_next(v_state);
      v_rnd := private_game.lcg_frac(v_state);
      v_swap_idx := 1 + floor(v_rnd * (v_j + 1))::int;
      v_tmp := v_order[v_swap_idx];
      v_order[v_swap_idx] := v_order[1 + v_j];
      v_order[1 + v_j] := v_tmp;
    end loop;

    v_state := private_game.lcg_next(v_state);
    v_rnd := private_game.lcg_frac(v_state);
    v_tier := case when v_rnd < 0.16 then 'armored' when v_rnd < 0.32 then 'fast' else 'normal' end;
    v_lifetime := case v_tier
      when 'armored' then 2600 - p_difficulty * 60
      when 'fast'    then 1400 - p_difficulty * 40
      else                2300 - p_difficulty * 80 end;
    v_lifetime := greatest(700, v_lifetime);
    v_value := case v_tier when 'armored' then 150 when 'fast' then 200 else 100 end;
    v_spawn_ms := (v_i / v_per_wave) * v_gap_base + (v_i % v_per_wave) * 420 + 600;

    -- Use 1-based index and #> operator for nested JSONB array access.
    v_lane_idx := v_order[1];
    v_targets := v_targets || jsonb_build_object(
      'id', 't' || (v_i + 1),
      'x', (v_lanes #> array[v_lane_idx::text, '0'])::text::int,
      'y', (v_lanes #> array[v_lane_idx::text, '1'])::text::int,
      'spawnMs', v_spawn_ms,
      'lifetimeMs', v_lifetime,
      'tier', v_tier,
      'value', v_value
    );
  end loop;
  return jsonb_build_object('targets', v_targets, 'durationMs',
    ((v_total - 1) / v_per_wave) * v_gap_base + 420 * (v_per_wave - 1) + 600 + 2600 + 1500,
    'comboWindowMs', 1500, 'minHitRatio', 0.5);
end;
$$;
