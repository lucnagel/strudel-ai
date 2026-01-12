#!/usr/bin/env bun
/**
 * Local Claude Code Bridge for Strudel AI
 *
 * Spawns the Claude CLI to generate Strudel patterns.
 * Uses JSON schema for guaranteed structured output.
 *
 * Usage: bun run scripts/claude-bridge.ts
 *
 * Requires: Claude CLI installed and authenticated (run `claude login` first)
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'

const PORT = 3001

// JSON Schema for structured output - guarantees code-only response
const CODE_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    code: {
      type: 'string',
      description: 'The complete Strudel code that ends with .play()'
    }
  },
  required: ['code'],
  additionalProperties: false
}

const STRUDEL_SYSTEM_PROMPT = `You are a Strudel code generator. You output ONLY valid executable code. No explanations. No prose. No markdown.

# STRUDEL PATTERN LANGUAGE REFERENCE

## MINI NOTATION
- "a b c d" - sequence, one per beat
- "~ a" - rest then sound
- "[a b c]" - subdivide into one beat
- "a*3" - repeat 3 times
- "a/2" - span 2 cycles
- "<a b c>" - alternate each cycle
- "a?" - 50% chance
- "a(3,8)" - euclidean rhythm
- "<x@7 ~>/8" - weighted alternation
- "[x@0.2 ~]" - weighted subdivision

## SAMPLES (from dirt-samples)
Drums: bd, sd, hh, cp, cr, cb, rs, hc, ht, lt, mt, sn
Breaks: breaks125, breaks152, breaks157, breaks165, jungle
Bass: bass, bass0, bass1, bass2, bass3, jungbass, jvbass
Synth: arpy, arp, pluck, pad
Vocal: speech, rave, rave2, yeah
Percussion: tabla, tabla2, east, perc, casio, crow, gab, feel
Effects: noise, noise2, glitch, glitch2, hit
Retro: bleep, blip, space
Use variants: s("bd:2"), s("hh:3"), s("breaks157:0")

## DRUM MACHINE BANKS (use with .bank())
s("bd sd hh cp").bank("RolandTR808") - classic 808
s("bd sd hh oh").bank("RolandTR909") - classic 909
s("bd sd hh").bank("RolandTR707")
s("bd sd hh").bank("RolandTR606")
s("bd sd hh").bank("RolandCR78")
s("bd sd hh").bank("LinnDrum")
s("bd sd oh").bank("AkaiLinn")
s("bd sd oh").bank("Oberheim DMX")
s("bd sd hh").bank("Sequential Circuits DrumTraks")
Standard drum sounds: bd, sd, hh, oh, cp, rs, cb, lt, mt, ht, cr, cl, rim, tom

## SYNTHS
.s('sawtooth'), .s('sine'), .s('square'), .s('triangle')
note("c3 e3 g3") - notes
n("0 2 4").scale("C:minor") - scale degrees

## ENVELOPES (ADSR)
.attack(0.01) - attack time
.decay(0.1) - decay time
.sustain(0.5) - sustain level
.release(0.2) - release time

## FILTERS
.lpf(800), .hpf(200), .cutoff(800), .resonance(10), .lpq(5)
Filter envelope: .lpe(amount), .lpa(attack), .lpd(decay), .lpr(release)
.cutoff(perlin.range(500,2000)) - modulated filter

## EFFECTS
.gain(0.8) - volume
.room(0.5) - reverb
.delay(0.3).dt(0.125).dfb(0.5) - delay (dt=delaytime, dfb=feedback)
.pan(sine.range(0.3,0.7)) - modulated panning
.velocity(0.7) - note velocity
.vowel() - vowel filter (use with vowels: u, e, a, i, o in pattern)
.adsr("0.07:.1:0.6:0.1") - ADSR as colon-separated string
.clip(0.8) - clip note length

## CHORDS & VOICING
chord("<Cm7 Bb7 Fm7 G7>/2") - chord progression
.dict('lefthand').voicing() - apply voicing
.add(note("-12")) - transpose octave

## PATTERN MODIFIERS
.fast(2), .slow(2) - speed
.early(1/8), .late(1/8) - shift timing forward/back
.swing(2) - add swing feel
.mask("<x@7 ~>/8") - rhythmic mask
.struct("[~ x]*2") - apply rhythm structure

## CONDITIONAL TRANSFORMS
.every(4, x => x.fast(2)) - every Nth cycle
.sometimes(x => x.rev()) - 50% chance
.sometimesBy(0.25, x => x.fast(2)) - custom probability
.when("0 1 0 0", x => x.delay(0.5)) - pattern-based condition
.lastOf(4, x => x.fast(2)) - only last of N cycles
.firstOf(4, x => x.fast(2)) - only first of N cycles

## LAYERING & VARIATION
stack(drums, synths) - layer multiple patterns
.layer(x=>x, x=>x.add(7).early(1/8)) - parallel transforms
.superimpose(x => x.add(5)) - layer with transform
.off(1/4, x => x.add(7)) - delayed copy with transform
cat("bd bd", "cp cp") - concatenate patterns
fastcat("bd bd", "cp cp") - concatenate in one cycle

## SONG STRUCTURE
setcpm(130/4) - set tempo (cycles per minute)
arrange([bars, pattern], ...) - arrange sections in sequence
silence - empty pattern for breaks/intros

Example song structure:
const intro = s("bd*4").gain(0.7)
const verse = stack(s("bd sd"), s("hh*4"), note("c2 g1").s("sawtooth").lpf(300))
const chorus = stack(s("bd sd hh cp"), note("c3 e3 g3").s("sine"))
arrange([8, intro], [16, verse], [16, chorus], [2, silence]).play()

## MODULATION SOURCES
perlin - smooth noise (perlin.range(0,1))
sine - sine LFO (sine.range(0.3,0.7))
saw - sawtooth LFO
run(16) - ramp 0-15 over pattern (great for buildups)
Example: .gain(run(32).mul(1/31)) - gradual volume increase

## GENRE TEMPLATES

### Ambient / Drone (slow, evolving, textural)
stack(
  note("<c2 g1 f2 eb2>/4").s("triangle").attack(0.5).release(2).lpf(400).room(0.9).gain(0.3),
  note("c4 e4 g4 b4").s("sine").attack(0.1).release(0.5).delay(0.6).delaytime(0.25).lpf(perlin.range(400,1200)).gain(0.2).slow(2)
).slow(2).play()

### Jungle / DnB (fast breaks, sub bass, chopped)
stack(
  s("jungle:0").lpf(2000).gain(0.8),
  s("bd:3 ~ bd:3 [~ bd:2]").bank("RolandTR909").gain(0.7),
  s("[hh hh:2]*4").bank("RolandTR909").gain(0.4).sometimes(x => x.fast(2)),
  note("<c1 c1 [g0 g1] f1>/2").s("sawtooth").lpf(200).decay(0.1).sustain(0.8).gain(0.6)
).fast(1.5).play()

### Dub Techno (deep, spacious, hypnotic)
stack(
  s("bd ~ ~ bd:2 ~ ~ bd ~").gain(0.8),
  s("~ cp:2 ~ ~").room(0.8).delay(0.6).delaytime(0.167).delayfeedback(0.5).gain(0.4),
  chord("<Cm7 Fm7 Gm7 Cm7>/4").dict('lefthand').voicing().s("sine").lpf(800).room(0.7).delay(0.5).gain(0.25),
  note("[~ c2] [~ g1] [~ eb2] [~ bb1]").s("sawtooth").lpf(300).gain(0.5)
).slow(1.5).play()

### Industrial / Dark (mechanical, harsh, distorted)
stack(
  s("bd:4*2").gain(1),
  s("~ sd:3").room(0.3).gain(0.8),
  s("[metal:2 metal:3]*2").gain(0.3).every(3, x => x.fast(2)),
  note("[c1 c1 eb1 ~]").s("sawtooth").cutoff(perlin.range(200,800)).resonance(15).gain(0.6).distort(0.3)
).play()

### IDM / Glitch (irregular, complex, modulated)
stack(
  s("bd:2 ~ [bd ~ bd:3] [~ bd]").every(3, x => x.rev()),
  s("[hh hh:2]*4").struct("<x ~!3>/2").gain(0.4).pan(perlin.range(0.3,0.7)),
  note("[c3 ~ e3] [g3 ~ ~] [c4 b3 ~]").s("square").lpf(perlin.range(800,2000)).decay(0.15).sustain(0.3).gain(0.3)
).every(4, x => x.slow(0.5)).sometimes(x => x.fast(1.5)).play()

### UK Bass / Halfstep (syncopated, deep, sparse)
stack(
  s("bd ~ ~ bd:2 ~ [bd ~] ~ ~").gain(0.9),
  s("~ ~ sd ~ ~ ~ [sd:2 sd] ~").room(0.4).gain(0.7),
  s("[~ hh:2]*4").gain(0.35),
  note("~ c2 ~ ~ [g1 ~] ~ ~ [f2 eb2]").s("sawtooth").lpf(250).decay(0.2).sustain(0.7).gain(0.65)
).play()

### House / Deep (4/4, chords, groove)
stack(
  s("bd*4").gain(0.85),
  s("~ cp ~ cp").room(0.3).gain(0.5),
  s("~ hh:2 [~ hh] hh:2").gain(0.4),
  chord("<Am7 Dm7 G7 Cmaj7>/2").dict('lefthand').voicing().s("sine").lpf(1200).room(0.4).attack(0.02).decay(0.2).sustain(0.4).gain(0.3),
  note("<a1 d2 g1 c2>/2").s("sawtooth").lpf(400).gain(0.5)
).slow(1.2).play()

### Amapiano (log drums, piano, percussive)
stack(
  s("bd ~ bd:2 ~").gain(0.7),
  s("~ cp ~ cp").room(0.5).gain(0.4),
  s("[~ hh]*4").gain(0.25),
  chord("<Am7 Fmaj7 C Dm7>/2").s("sine").attack(0.01).decay(0.3).sustain(0.2).room(0.5).gain(0.4)
).slow(1.3).play()

### Experimental / Deconstructed (sparse, textural, unpredictable)
stack(
  s("bd:3 ~ ~ ~ [bd ~ bd:2] ~ ~ ~").mask("<x@7 ~>/4").gain(0.8),
  s("~ ~ cp:2 ~ ~ ~ ~ [sd ~]").room(0.6).delay(0.4).delayfeedback(0.6).gain(0.5),
  note("[c2 ~] [~ g2] [~ ~] [f2 ~]").s("sawtooth").lpf(perlin.range(200,600)).attack(0.05).release(0.3).gain(0.5)
).sometimes(x => x.early(0.125)).play()

## VALID METHODS - USE ONLY THESE
Sounds: s(), note(), n(), chord(), sound(), .bank()
Notes: .sub(), .add(), .mul() - arithmetic on notes
Filters: .lpf(), .hpf(), .cutoff(), .resonance(), .lpq(), .hpq(), .ftype('ladder'), .lpenv(), .hpenv(), .fanchor()
Envelope: .attack(), .decay(), .sustain(), .release(), .dec() (decay shorthand)
Synth: .vib(), .vibmod(), .penv(), .velocity(), .fm()
Effects: .gain(), .room(), .delay(), .delaytime(), .delayfeedback(), .pan(), .distort()
Modifiers: .fast(), .slow(), .early(), .rev(), .every(), .sometimes(), .lastOf(), .firstOf(), .mask(), .struct(), .add()
Voicing: .dict(), .voicing(), .scale(), .scaleTranspose()
Layers: stack(), .layer()
LFOs: perlin.range(), sine.range(), saw.range(), sine.fast(), saw.mul()

## DO NOT USE IN GENERATED CODE
._scope(), ._punchcard(), ._pitchwheel(), .color(), .pianoroll() - visualization only
mousex, mousey - interactive only, won't work in static code
$: syntax - use stack().play() instead

## CRITICAL SYNTAX RULES
1. Output ONLY valid JavaScript - no spaces before method dots
2. ONLY use methods listed in VALID METHODS above
3. Always end with .play()
4. Use stack() for layers
5. Scale format: .scale("C:minor") not "minor:C"
6. Sample names use colon for variants: s("bd:2") not s("bd/2")
7. DO NOT invent or hallucinate new methods

CRITICAL OUTPUT RULES - FOLLOW EXACTLY:
1. Output ONLY executable Strudel/JavaScript code in the "code" field
2. NO prose, explanations, or descriptions - just the code
3. NO markdown code blocks or backticks
4. Start directly with code (setcpm, const, let, s(, note(, stack(, etc.)
5. NO spaces before dots in method chains
6. Use ONLY the sample names listed above
7. End with .play()
8. Put the complete working code in the "code" field of your JSON response

Your response will be parsed as JSON with a "code" field containing valid Strudel code.`

interface GenerateRequest {
  prompt: string
  currentCode?: string
  errorToFix?: string
}

/**
 * Extract Strudel code from Claude's response.
 * Handles various response formats:
 * 1. Clean code only
 * 2. Markdown code blocks
 * 3. Explanatory text before and/or after code
 */
function extractCode(output: string): string {
  let text = output.trim()

  // First, try to extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:javascript|js|strudel)?\n?([\s\S]*?)```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Remove any remaining markdown fence markers
  text = text.replace(/^```(?:javascript|js|strudel)?\n?/gm, '').replace(/\n?```$/gm, '')

  // Find .play() - all valid Strudel code ends with this
  const playMatch = text.match(/\.play\s*\(\s*\)/)
  if (playMatch && playMatch.index !== undefined) {
    // Truncate everything after .play()
    text = text.slice(0, playMatch.index + playMatch[0].length)
  }

  // Look for the start of actual Strudel code
  // Common patterns: setcpm, const, let, s(, note(, stack(, etc.
  const codeStartPatterns = [
    /^setcpm\s*\(/m,
    /^const\s+\w+\s*=/m,
    /^let\s+\w+\s*=/m,
    /^s\s*\(/m,
    /^note\s*\(/m,
    /^n\s*\(/m,
    /^stack\s*\(/m,
    /^chord\s*\(/m,
    /^arrange\s*\(/m,
    /^silence/m,
  ]

  for (const pattern of codeStartPatterns) {
    const match = text.match(pattern)
    if (match && match.index !== undefined) {
      // Found code start - extract from here
      text = text.slice(match.index)
      break
    }
  }

  return text.trim()
}

const app = new Hono()

// CORS for development
app.use('/*', cors())

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    auth: 'claude-code-cli'
  })
})

// Generate endpoint - uses Claude CLI to generate Strudel patterns
app.post('/api/generate', async (c) => {
  const { prompt, currentCode, errorToFix } = await c.req.json<GenerateRequest>()

  if (!prompt) {
    return c.json({ error: 'prompt is required' }, 400)
  }

  // Build the user message
  let userMessage: string
  if (errorToFix && currentCode) {
    userMessage = `The following Strudel code has an error:

\`\`\`javascript
${currentCode}
\`\`\`

Error message: ${errorToFix}

Fix the code to resolve this error. The original request was: "${prompt}"

Output ONLY the corrected code, no explanations.`
  } else if (currentCode) {
    userMessage = `Current pattern:\n${currentCode}\n\nRequest: ${prompt}`
  } else {
    userMessage = prompt
  }

  console.log(`[Claude Bridge] Generating pattern for: "${prompt.slice(0, 50)}..."`)

  try {
    // Append code-only reminder to user message
    const messageWithReminder = `${userMessage}

[IMPORTANT: Return ONLY the code in the "code" field. No explanations. Start directly with setcpm/const/stack/etc.]`

    // Build command args - use JSON schema for structured output
    const args = [
      'claude',
      '--print',
      '--output-format', 'json',
      '--json-schema', JSON.stringify(CODE_OUTPUT_SCHEMA),
      '--dangerously-skip-permissions',
      '--system-prompt', STRUDEL_SYSTEM_PROMPT,
      messageWithReminder
    ]

    // Spawn Claude CLI
    const claudeProcess = Bun.spawn(args, {
      cwd: process.env.HOME || '/',
      env: {
        ...process.env,
        CI: 'true'
      },
      stdout: 'pipe',
      stderr: 'pipe'
    })

    // Collect stdout
    const stdoutReader = claudeProcess.stdout.getReader()
    let output = ''
    while (true) {
      const { done, value } = await stdoutReader.read()
      if (done) break
      output += new TextDecoder().decode(value)
    }

    // Wait for process to exit
    const exitCode = await claudeProcess.exited

    if (exitCode !== 0) {
      // Read stderr
      const stderrReader = claudeProcess.stderr.getReader()
      let stderrText = ''
      while (true) {
        const { done, value } = await stderrReader.read()
        if (done) break
        stderrText += new TextDecoder().decode(value)
      }
      console.error('[Claude Bridge] CLI error:', stderrText)

      return c.json({
        error: `Claude CLI exited with code ${exitCode}: ${stderrText.trim()}`
      }, 500)
    }

    // Log raw output for debugging
    console.log('[Claude Bridge] Raw JSON output:')
    console.log('---START---')
    console.log(output)
    console.log('---END---')

    // Parse structured JSON response
    let code: string
    try {
      const jsonResponse = JSON.parse(output)

      // Claude CLI JSON output has structured_output.code when using --json-schema
      if (jsonResponse.structured_output?.code) {
        code = jsonResponse.structured_output.code
      } else if (jsonResponse.result) {
        // Fallback: result can be a string (the JSON response) or already parsed
        const resultData = typeof jsonResponse.result === 'string'
          ? JSON.parse(jsonResponse.result)
          : jsonResponse.result
        code = resultData.code || resultData
      } else if (jsonResponse.code) {
        code = jsonResponse.code
      } else {
        throw new Error('No code field in response')
      }
    } catch (parseError) {
      // Fallback to text extraction if JSON parsing fails
      console.warn('[Claude Bridge] JSON parse failed, falling back to text extraction')
      code = extractCode(output)
    }

    // Final cleanup - remove any leading/trailing whitespace or markdown artifacts
    code = code.trim()
    if (code.startsWith('```')) {
      code = extractCode(code)
    }

    console.log(`[Claude Bridge] Generated ${code.length} characters`)
    console.log('[Claude Bridge] Final code:')
    console.log('---START---')
    console.log(code)
    console.log('---END---')

    return c.json({ code })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Claude Bridge] Error:', errorMessage)
    return c.json({ error: errorMessage }, 500)
  }
})

console.log(`
Claude Code Bridge for Strudel AI
==================================
Server running at http://localhost:${PORT}

Endpoints:
  POST /api/generate  - Generate Strudel patterns
  GET  /api/health    - Health check

Using Claude CLI (run 'claude login' if not authenticated)

Press Ctrl+C to stop
`)

export default {
  port: PORT,
  fetch: app.fetch
}
