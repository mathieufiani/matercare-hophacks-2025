"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, MessageCircle, Shield, Sparkles, Star, Users, Award, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })
  
  const router = useRouter()

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const particlesY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const floatingElementsY = useTransform(scrollYProgress, [0, 1], ["0%", "80%"])

    // 🔑 Redirect if logged in
    useEffect(() => {
      const accessToken = sessionStorage.getItem("access_token")
      if (accessToken) {
        router.replace("/app") // replace so back button won’t return to landing
      }
    }, [router])

  return (
    <div ref={containerRef} className="min-h-screen">
      {/* Enhanced Hero Section with Advanced Parallax */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div style={{ y: particlesY }} className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
          <div className="absolute top-32 right-20 w-1 h-1 bg-accent/60 rounded-full animate-pulse delay-1000" />
          <div className="absolute bottom-40 left-1/4 w-3 h-3 bg-secondary/30 rounded-full animate-pulse delay-2000" />
          <div className="absolute bottom-20 right-1/3 w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse delay-3000" />
        </motion.div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="container mx-auto px-4 z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Enhanced Logo with Glassmorphism */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8"
            >
              <div className="w-24 h-24 mx-auto mb-6 glass-strong rounded-3xl flex items-center justify-center shadow-2xl">
                <Heart className="w-12 h-12 text-primary drop-shadow-sm" />
              </div>
            </motion.div>

            {/* Enhanced Main Heading with Gradient Animation */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-6xl md:text-8xl font-bold text-balance mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient"
            >
              MaterCare
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-xl md:text-2xl text-muted-foreground text-balance mb-4 leading-relaxed"
            >
              Your compassionate AI wellness companion for the beautiful journey of motherhood
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex items-center justify-center gap-6 mb-8 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" />
                <span>Privacy First</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>10k+ Mothers</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-secondary" />
                <span>Expert Approved</span>
              </div>
            </motion.div>

            {/* Enhanced CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                size="lg"
                className="text-lg px-10 py-7 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <Link href="/auth/sign-up" className="flex items-center gap-2">
                  Start Your Journey
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-10 py-7 rounded-2xl glass-strong bg-transparent hover:bg-card/60 transition-all duration-300"
              >
                <Link href="/auth/sign-in">Sign In</Link>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Enhanced Floating Elements with Advanced Parallax */}
        <motion.div
          style={{ y: floatingElementsY }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="absolute top-20 left-10 w-20 h-20 glass-strong rounded-2xl flex items-center justify-center shadow-xl"
        >
          <Sparkles className="w-10 h-10 text-accent" />
        </motion.div>

        <motion.div
          style={{ y: floatingElementsY }}
          animate={{
            y: [0, 15, 0],
            rotate: [0, -3, 0],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute top-32 right-16 w-16 h-16 glass-strong rounded-2xl flex items-center justify-center shadow-xl"
        >
          <Heart className="w-8 h-8 text-primary" />
        </motion.div>

        <motion.div
          style={{ y: floatingElementsY }}
          animate={{
            y: [0, -10, 0],
            rotate: [0, 2, 0],
          }}
          transition={{
            duration: 7,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 4,
          }}
          className="absolute bottom-32 left-20 w-14 h-14 glass rounded-xl flex items-center justify-center shadow-lg"
        >
          <Star className="w-7 h-7 text-secondary" />
        </motion.div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-24 px-4 relative">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-balance mb-8">Supportive Care, Every Step</h2>
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto leading-relaxed">
              Experience personalized wellness support designed specifically for your maternal journey, with
              cutting-edge AI technology and evidence-based care practices.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              {
                icon: MessageCircle,
                title: "AI Companion Chat",
                description:
                  "Get instant, empathetic support through text and voice conversations with our specialized AI wellness companion trained on maternal health expertise.",
                features: ["24/7 Availability", "Voice & Text Support", "Personalized Responses"],
              },
              {
                icon: Heart,
                title: "Mood Tracking",
                description:
                  "Monitor your emotional wellbeing with gentle check-ins and personalized insights to support your mental health throughout your journey.",
                features: ["Daily Check-ins", "EPDS Screening", "Trend Analysis"],
              },
              {
                icon: Shield,
                title: "Crisis Support",
                description:
                  "Access immediate help and resources when you need them most, with 24/7 crisis intervention and safety features designed for maternal wellness.",
                features: ["Instant Help Access", "Emergency Resources", "Safety Planning"],
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="p-10 glass-strong hover:glass transition-all duration-500 h-full group hover:scale-105 hover:shadow-2xl">
                  <div className="w-20 h-20 glass rounded-3xl flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold text-center mb-6">{feature.title}</h3>
                  <p className="text-muted-foreground text-center leading-relaxed mb-6">{feature.description}</p>

                  <div className="space-y-2">
                    {feature.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-accent rounded-full" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-b from-transparent to-muted/20">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-balance mb-6">Trusted by Mothers Everywhere</h2>
            <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
              Join thousands of mothers who have found support and guidance through MaterCare
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Sarah M.",
                role: "New Mother",
                content:
                  "MaterCare helped me through my postpartum anxiety. The AI companion was always there when I needed support at 3am.",
                rating: 5,
              },
              {
                name: "Jessica L.",
                role: "Expecting Mother",
                content:
                  "The mood tracking feature helped me understand my emotional patterns during pregnancy. It's like having a wellness coach in my pocket.",
                rating: 5,
              },
              {
                name: "Maria R.",
                role: "Mother of Two",
                content:
                  "The crisis support feature was a lifesaver during a difficult time. I felt safe knowing help was always available.",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="p-8 glass-strong h-full">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-6">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="py-16 px-4 border-t border-border/50 bg-gradient-to-t from-muted/10 to-transparent">
        <div className="container mx-auto">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto glass rounded-2xl flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground font-medium">
                MaterCare provides supportive coaching and information. It is not medical advice.
              </p>
              <p className="text-sm text-muted-foreground">
                Always consult with healthcare professionals for medical concerns.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-primary transition-colors">
                Contact
              </Link>
              <Link href="/support" className="hover:text-primary transition-colors">
                Support
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">© 2024 MaterCare. Built with care for maternal wellness.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
