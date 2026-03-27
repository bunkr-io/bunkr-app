import {
  ChartLine,
  ChevronLeft,
  ChevronRight,
  Lock,
  PieChart,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '~/lib/utils'

interface Slide {
  icon: React.ReactNode
  title: string
  description: string
}

const SLIDES: Slide[] = [
  {
    icon: <ChartLine className="size-10" />,
    title: 'Net Worth Tracking',
    description:
      'See your complete financial picture in one place. Track how your wealth evolves over time across all your accounts.',
  },
  {
    icon: <Lock className="size-10" />,
    title: 'Zero-Knowledge Encryption',
    description:
      'Your data is encrypted end-to-end. Not even we can access it — only you hold the keys to your financial information.',
  },
  {
    icon: <Wallet className="size-10" />,
    title: 'Bank Aggregation',
    description:
      'Connect all your bank accounts, brokerages, and crypto wallets. Everything syncs automatically via open banking.',
  },
  {
    icon: <PieChart className="size-10" />,
    title: 'Portfolio Analytics',
    description:
      'Understand your asset allocation, track investment performance, and spot opportunities to rebalance.',
  },
  {
    icon: <RefreshCw className="size-10" />,
    title: 'Cash Flow Insights',
    description:
      'Categorize transactions automatically. See where your money goes and identify patterns in your spending.',
  },
]

const INTERVAL = 5000

export function WaitlistCarousel({ className }: { className?: string }) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const directionRef = useRef(1)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      directionRef.current = 1
      setDirection(1)
      setCurrent((prev) => (prev + 1) % SLIDES.length)
    }, INTERVAL)
    return () => clearInterval(timer)
  }, [resetKey])

  function resetTimer() {
    setResetKey((k) => k + 1)
  }

  function goTo(index: number) {
    const dir = index > current ? 1 : -1
    directionRef.current = dir
    setDirection(dir)
    setCurrent(index)
    resetTimer()
  }

  function prev() {
    directionRef.current = -1
    setDirection(-1)
    setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length)
    resetTimer()
  }

  function next() {
    directionRef.current = 1
    setDirection(1)
    setCurrent((c) => (c + 1) % SLIDES.length)
    resetTimer()
  }

  const slide = SLIDES[current]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-8',
        className,
      )}
    >
      <div className="flex items-center gap-6">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={prev}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <ChevronLeft className="size-5" />
        </button>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, y: 20 * directionRef.current }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 * directionRef.current }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="flex max-w-md flex-col items-center gap-4 text-center"
          >
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {slide.icon}
            </div>
            <h2 className="text-2xl font-bold">{slide.title}</h2>
            <p className="text-balance text-muted-foreground">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          aria-label="Next slide"
          onClick={next}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === current ? 'w-6 bg-primary' : 'w-2 bg-primary/20',
            )}
          />
        ))}
      </div>
    </div>
  )
}
