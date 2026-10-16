export type ToastType = 'success' | 'danger' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

type ToastListener = (toasts: ToastMessage[]) => void

class ToastManager {
  private toasts: ToastMessage[] = []
  private listeners: Set<ToastListener> = new Set()

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener)
    listener(this.toasts)
    return () => this.listeners.delete(listener)
  }

  show(message: string, type: ToastType = 'info', durationMs = 4000) {
    if (!message) return
    const id = Math.random().toString(36).substring(2, 9)
    const toast: ToastMessage = { id, message, type }
    this.toasts = [...this.toasts, toast]
    this.notify()

    setTimeout(() => {
      this.dismiss(id)
    }, durationMs)
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id)
    this.notify()
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.toasts))
  }
}

export const toast = new ToastManager()
