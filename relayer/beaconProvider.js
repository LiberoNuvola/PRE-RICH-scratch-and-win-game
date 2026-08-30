'use strict'

/**
 * Materios / external beacon source adapter.
 *
 * IMPORTANT:
 * This module does NOT decide game outcomes.
 * It only retrieves the canonical external inputs:
 *
 *   mcHash
 *   materiosContext
 *
 * The Cardano BeaconRegistry recomputes:
 *
 *   R = deriveBeacon(target, mcHash, materiosContext)
 *
 * on-chain.
 */

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

function hexToBytes(value, fieldName) {
  const clean = String(value).replace(/^0x/, '')

  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error(`${fieldName} must be even-length hexadecimal`)
  }

  return Buffer.from(clean, 'hex')
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Materios response is not an object')
  }

  const mcHash = payload.mcHash
  const materiosContext = payload.materiosContext

  if (typeof mcHash !== 'string' || mcHash.length === 0) {
    throw new Error('Materios response missing mcHash')
  }

  if (
    typeof materiosContext !== 'string' ||
    materiosContext.length === 0
  ) {
    throw new Error('Materios response missing materiosContext')
  }

  return {
    mcHash: hexToBytes(mcHash, 'mcHash'),
    materiosContext: hexToBytes(
      materiosContext,
      'materiosContext',
    ),
  }
}

/**
 * Fetch the external round source.
 *
 * Expected response:
 *
 * {
 *   "mcHash": "<hex>",
 *   "materiosContext": "<hex>"
 * }
 *
 * The exact endpoint is deliberately configurable.
 */
async function getRoundSource(round) {
  const baseUrl = requiredEnv('MATERIOS_API_URL')

  const url = new URL(baseUrl)
  url.searchParams.set('round', String(round))

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(
      `Materios HTTP ${response.status}: ${response.statusText}`,
    )
  }

  const payload = await response.json()
  return validatePayload(payload)
}

module.exports = {
  getRoundSource,
}