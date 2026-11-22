import { useEffect } from 'react'
import { useLocation } from 'react-router'

/** Ao trocar de página, volta ao topo; se o link tiver #âncora, rola até ela. */
export function ScrollToHash() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])

  return null
}
