"use client"

import { useEffect, useState } from "react"
import { vibrate } from "@/lib/vibration"

export type ToastType = "success" | "error" | "info" | "warning"

interface Toast {
  id: string
  message: string
  type: ToastType
}

let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

function notify() {
  toastListeners.forEach((listener) => listener([...toasts]))
}

export function showToast(message: string, type: ToastType = "info") {
  vibrate()
  const id = Math.random().toString(36).substring(7)
  toasts = [...toasts, { id, message, type }]
  notify()

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    notify()
  }, 3000)
}

export function ToastContainer() {
  const [toastList, setToastList] = useState<Toast[]>([])

  useEffect(() => {
    toastListeners.push(setToastList)
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToastList)
    }
  }, [])

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
      {toastList.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto min-w-[300px] max-w-md p-4 rounded-lg shadow-lg animate-slide-in-right ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : toast.type === "error"
                ? "bg-red-500 text-white"
                : toast.type === "warning"
                  ? "bg-yellow-500 text-white"
                  : "bg-blue-500 text-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <i
              className={`fas ${
                toast.type === "success"
                  ? "fa-check-circle"
                  : toast.type === "error"
                    ? "fa-exclamation-circle"
                    : toast.type === "warning"
                      ? "fa-exclamation-triangle"
                      : "fa-info-circle"
              } text-xl`}
            ></i>
            <p className="font-semibold flex-1">{toast.message}</p>
            <button
              onClick={() => {
                toasts = toasts.filter((t) => t.id !== toast.id)
                notify()
              }}
              className="text-white/80 hover:text-white"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}


