import { useEffect, useState } from 'react'

/**
 * What it takes to get this app onto the home screen, on whatever the
 * person is holding.
 *
 * There is no single way to install a PWA. Chrome fires
 * `beforeinstallprompt` and lets the page trigger the real install
 * dialog; iOS has no such event and never will, so Safari users have
 * to be walked through the share sheet by hand. And neither works at
 * all inside an in-app browser — the link opened from WhatsApp has no
 * "add to home screen" anywhere in it, which is the quiet failure this
 * is really here to catch.
 */

export type InstallPlatform = 'ios' | 'android' | 'desktop'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallState {
  /** Already running from the home screen — nothing left to do. */
  installed: boolean
  platform: InstallPlatform
  /**
   * An in-app browser (WhatsApp, Instagram, a webview). Installing is
   * impossible from here at all; the only step that helps is "open it
   * in your real browser".
   */
  inAppBrowser: boolean
  /** iOS, but not Safari — the share sheet won't have the option. */
  iosNonSafari: boolean
  /**
   * Chrome's own install dialog, when the browser has offered it.
   * Null on iOS, and null on Chrome until the event fires.
   */
  promptInstall: null | (() => Promise<'accepted' | 'dismissed'>)
}

function detectPlatform(ua: string): InstallPlatform {
  // iPadOS 13+ reports itself as a Mac, so the touch-point count is
  // the only thing that separates an iPad from a desktop Safari.
  const iPadOS =
    /macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1
  if (/iphone|ipad|ipod/i.test(ua) || iPadOS) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'desktop'
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // iOS Safari never implemented display-mode, so it needs its own
  // non-standard flag.
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true
  return window.matchMedia?.('(display-mode: standalone)').matches === true || iosStandalone
}

export function useInstallState(): InstallState {
  const [installed, setInstalled] = useState(isStandalone)
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Keep the event so the install can happen on a real tap later —
      // without this the browser's own banner is all you get, and it
      // only appears on its own schedule.
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => { setInstalled(true); setPromptEvent(null) }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    // Someone can launch the installed app from the home screen while
    // the tab is still open in the browser; watch rather than sample.
    const mq = window.matchMedia?.('(display-mode: standalone)')
    const onChange = () => setInstalled(isStandalone())
    mq?.addEventListener?.('change', onChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      mq?.removeEventListener?.('change', onChange)
    }
  }, [])

  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const platform = detectPlatform(ua)
  // FBAN/FBAV: Facebook. Instagram, Line, WhatsApp (wv = Android
  // webview) all ship their own browser with no install affordance.
  const inAppBrowser = /FBAN|FBAV|Instagram|Line\/|; wv\)|WhatsApp/i.test(ua)
  // CriOS = Chrome on iOS, FxiOS = Firefox, EdgiOS = Edge, OPT = Opera.
  const iosNonSafari = platform === 'ios' && /CriOS|FxiOS|EdgiOS|OPT\//i.test(ua)

  return {
    installed,
    platform,
    inAppBrowser,
    iosNonSafari,
    promptInstall: promptEvent
      ? async () => {
          await promptEvent.prompt()
          const { outcome } = await promptEvent.userChoice
          // The event is single-use; drop it so the button can't be
          // tapped into a no-op.
          setPromptEvent(null)
          return outcome
        }
      : null,
  }
}
