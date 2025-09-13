"use client"
import { MessageCircle, HeartPulse, UserRound } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"

const navItems = [
  {
    href: "/app",
    icon: MessageCircle,
    label: "Chat",
  },
  {
    href: "/app/check-in",
    icon: HeartPulse,
    label: "Check-in",
  },
  {
    href: "/app/profile",
    icon: UserRound,
    label: "Profile",
  },
]

export function FooterNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border/50 p-4 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-1 p-2 rounded-xl transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              <div className="relative z-10">
                <Icon className={`w-6 h-6 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              </div>

              <span
                className={`text-xs relative z-10 ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
