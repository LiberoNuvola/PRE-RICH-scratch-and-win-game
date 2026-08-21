declare const window: any

let lucidInstance: any = null
let connectedWallet: string | null = null

export type ConnectResult = { lucid: any; address: string; walletName: string }

export async function connect(network = 'Preprod', _blockfrostUrl = '', _blockfrostProjectId = ''): Promise<ConnectResult> {
  const LucidGlobal = window.Lucid
  if (!LucidGlobal) {
    throw new Error('Lucid is not loaded yet. Please wait for the wallet script to finish initializing.')
  }

  // Prefer injected wallet providers (Nami, Eternl, etc.)
  const providers = (window as any).cardano
  if (providers) {
    const keys = Object.keys(providers)
    for (const k of keys) {
      try {
        const prov = (providers as any)[k]
        if (!prov?.enable) continue
        const api = await prov.enable()
        const lucid = await LucidGlobal.new(api, network)
        lucidInstance = lucid
        connectedWallet = k
        const address = await lucid.wallet.address()
        return { lucid, address, walletName: k }
      } catch (e) {
        // try next provider
      }
    }
  }
  throw new Error('No wallet extension found. Install Nami/Eternl/Flint and try again.')
}

export function getLucid() {
  return lucidInstance
}

export async function disconnect() {
  lucidInstance = null
  connectedWallet = null
}

export async function getAddress(): Promise<string> {
  if (!lucidInstance) throw new Error('Wallet not connected')
  return await lucidInstance.wallet.address()
}

export function isConnected(): boolean {
  return !!lucidInstance
}

export function connectedName(): string | null {
  return connectedWallet
}

export default { connect, getLucid, disconnect, getAddress, isConnected, connectedName }
