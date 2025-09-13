"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, TrendingUp, Calendar } from "lucide-react"
import { motion } from "framer-motion"

export default function CheckInPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 glass rounded-2xl flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Daily Check-In</h1>
          <p className="text-muted-foreground">Take a moment to reflect on how you're feeling today</p>
        </div>

        <div className="space-y-6">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Today's Wellness Check
              </CardTitle>
              <CardDescription>A quick assessment to help track your emotional wellbeing</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                Start Check-In
              </Button>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Your Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Complete your first check-in to see your wellness trends
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}
