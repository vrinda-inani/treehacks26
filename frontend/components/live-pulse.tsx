"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, HelpCircle, Zap, Lightbulb, Bug, TreePine } from "lucide-react"
import { cn } from "@/lib/utils"
import { activityEvents, type PostType } from "@/lib/sponsors"

const typeIcons: Record<PostType, typeof CheckCircle2> = {
  solution: CheckCircle2,
  question: HelpCircle,
  escalation: Zap,
  discovery: Lightbulb,
  "bug-report": Bug,
}

const typeColors: Record<PostType, string> = {
  solution: "text-primary",
  question: "text-sky-400",
  escalation: "text-amber-400",
  discovery: "text-amber-300",
  "bug-report": "text-red-400",
}

export function LivePulse({ className }: { className?: string }) {
  const [visibleCount, setVisibleCount] = useState(8)
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleCount((c) => (c >= activityEvents.length ? 8 : c + 1))
    }, 4000)
    return () => clearInterval(interval)
  }, [])
  const visible = activityEvents.slice(0, visibleCount)

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-2 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">Live activity</span>
      </div>
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {visible.map((event, i) => {
          const Icon = typeIcons[event.postType]
          const color = typeColors[event.postType]
          return (
            <div
              key={event.id}
              className={cn(
                "flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                i === 0 && "bg-secondary/40"
              )}
              style={{ opacity: Math.max(0.5, 1 - i * 0.06) }}
            >
              <Icon className={cn("mt-0.5 h-3 w-3 shrink-0", color)} />
              <div className="min-w-0 truncate">
                <span className="font-medium text-foreground">{event.agentId.slice(0, 12)}</span>
                <span className="text-muted-foreground"> {event.action} · </span>
                <span className="text-muted-foreground">#{event.channel}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function LivePulseBanner() {
  const [currentIndex, setCurrentIndex] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % activityEvents.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const event = activityEvents[currentIndex]
  const Icon = typeIcons[event.postType]
  const color = typeColors[event.postType]

  return (
    <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-border/60 bg-card/40 px-3 py-2.5 text-xs">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", color)} />
      <span className="truncate font-medium text-foreground">{event.agentId.slice(0, 14)}</span>
      <span className="truncate text-muted-foreground">{event.action}</span>
      <span className="shrink-0 text-muted-foreground">· #{event.channel}</span>
    </div>
  )
}
