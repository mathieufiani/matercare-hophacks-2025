"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { User, Settings, Shield, Moon, Sun, LogOut } from "lucide-react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { authAPI } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await authAPI.signOut()
    } catch (err) {
      console.warn("Logout API failed, clearing session anyway.", err)
    } finally {
      sessionStorage.clear()
      router.push("/auth/sign-in")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 glass rounded-2xl flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Profile & Settings</h1>
          <p className="text-muted-foreground">Manage your account and privacy preferences</p>
        </div>

        <div className="space-y-6">
          {/* Theme Settings */}
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <Label>Dark Mode</Label>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Consents */}
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Privacy & Consents
              </CardTitle>
              <CardDescription>Control how your data is used to improve your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Affect Assist (On-device only)</Label>
                  <p className="text-sm text-muted-foreground">
                    Analyze facial expressions locally to better understand your mood
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Store Chat History</Label>
                  <p className="text-sm text-muted-foreground">Save conversations to provide personalized support</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="glass">
            <CardContent className="pt-6">
              <Button onClick={handleSignOut} variant="outline" className="w-full glass bg-transparent">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}
