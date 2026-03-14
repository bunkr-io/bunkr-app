import { defineApp } from 'convex/server'
import polar from '@convex-dev/polar/convex.config.js'
import resend from '@convex-dev/resend/convex.config.js'

const app = defineApp()
app.use(polar)
app.use(resend)

export default app
