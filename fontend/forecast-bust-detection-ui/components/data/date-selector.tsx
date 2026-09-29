"use client"

import { CalendarIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HISTORICAL_RUNS } from "@/lib/config"
import { Badge } from "@/components/ui/badge"

export function DateSelector({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="min-w-[220px]">
        <CalendarIcon data-icon="inline-start" />
        <SelectValue placeholder="Select historical run" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {HISTORICAL_RUNS.map((run) => (
            <SelectItem key={run.date} value={run.date}>
              <span className="flex items-center gap-2">
                {run.date}
                <Badge variant={run.role === "held-out-test" ? "secondary" : "outline"} className="text-[10px]">
                  {run.role === "held-out-test" ? "Held-out test" : "Training"}
                </Badge>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
