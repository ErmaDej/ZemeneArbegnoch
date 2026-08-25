"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { t, type Lang } from "@/lib/i18n"

interface ErrorBoundaryProps {
  lang: Lang
  /** Called when the user dismisses the fallback (e.g. close the battle). */
  onDismiss?: () => void
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Converts any render/runtime crash inside an overlay (battle screens, trivia)
 * into a visible, dismissible card. Without this, one exception unmounts the
 * entire React tree and the player sees only a blank screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-6 backdrop-blur">
        <div className="w-full max-w-xs rounded-2xl border border-ember/40 bg-card p-5 text-center">
          <AlertTriangle className="mx-auto mb-3 size-8 text-ember" aria-hidden />
          <p className="mb-4 text-sm font-semibold text-foreground">
            {t(this.props.lang, "unexpected_error")}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/85"
            >
              {t(this.props.lang, "retry")}
            </button>
            {this.props.onDismiss && (
              <button
                type="button"
                onClick={this.props.onDismiss}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-bold text-secondary-foreground hover:bg-secondary/80"
              >
                {t(this.props.lang, "close")}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
}
