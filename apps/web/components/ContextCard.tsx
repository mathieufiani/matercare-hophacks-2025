"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, BookOpen } from "lucide-react"
import { motion } from "framer-motion"

interface ContextCardProps {
  title: string
  summary: string
  source: string
  url: string
}

export function ContextCard({ title, summary, source, url }: ContextCardProps) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
      <Card className="glass border-accent/20 bg-accent/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 glass rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-accent" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm mb-1 line-clamp-1">{title}</h4>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{summary}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-accent font-medium">{source}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => window.open(url, "_blank")}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Read
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
