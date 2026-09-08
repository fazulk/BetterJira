import '../src/styles/tokens.stylex'

export default defineNuxtPlugin(() => {
  if (import.meta.dev) {
    useHead({
      link: [{ key: 'stylex', rel: 'stylesheet', href: '/virtual:stylex.css' }],
    })
    void import('virtual:stylex:css-only')
  }
})
