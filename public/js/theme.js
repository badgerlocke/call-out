// Loaded in <head> before the body renders so the theme is set on the first paint.
(function () {
    const STORAGE_KEY = 'callout-theme'
    const LIGHT = 'light'
    const DARK = 'forest'
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)')

    // localStorage throws in Safari private browsing, so every access is guarded.
    function savedTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved === LIGHT || saved === DARK ? saved : null
        } catch (err) {
            return null
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme)
        } catch (err) {
            // A preference we cannot persist still applies for this page view.
        }
    }

    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme
        document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
            toggle.setAttribute('aria-pressed', String(theme === DARK))
            toggle.setAttribute(
                'aria-label',
                theme === DARK ? 'Switch to light mode' : 'Switch to dark mode'
            )
        })
        document.querySelectorAll('[data-theme-choice]').forEach((choice) => {
            const selected = choice.dataset.themeChoice === theme
            choice.setAttribute('aria-pressed', String(selected))
            choice.classList.toggle('btn-active', selected)
        })
    }

    function syncTheme(theme) {
        const url = document.documentElement.dataset.themeSyncUrl
        if (!url) return Promise.resolve()

        return fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme }),
        }).then((response) => {
            if (!response.ok) throw new Error('Theme save failed')
        })
    }

    function chooseTheme(theme) {
        saveTheme(theme)
        applyTheme(theme)
        document.querySelectorAll('[data-theme-error]').forEach((error) => {
            error.hidden = true
        })
        syncTheme(theme).catch(() => {
            document.querySelectorAll('[data-theme-error]').forEach((error) => {
                error.hidden = false
            })
        })
    }

    const accountTheme = document.documentElement.dataset.accountTheme
    const initialTheme =
        accountTheme === LIGHT || accountTheme === DARK
            ? accountTheme
            : savedTheme() || (systemPrefersDark.matches ? DARK : LIGHT)
    applyTheme(initialTheme)

    systemPrefersDark.addEventListener('change', (event) => {
        if (document.documentElement.dataset.accountTheme) return
        if (!savedTheme()) applyTheme(event.matches ? DARK : LIGHT)
    })

    document.addEventListener('DOMContentLoaded', () => {
        // Label the toggles now that they exist in the DOM.
        applyTheme(document.documentElement.dataset.theme)

        document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
            toggle.addEventListener('click', () => {
                const next = document.documentElement.dataset.theme === DARK ? LIGHT : DARK
                chooseTheme(next)
            })
        })

        document.querySelectorAll('[data-theme-choice]').forEach((choice) => {
            choice.addEventListener('click', () => {
                chooseTheme(choice.dataset.themeChoice)
            })
        })
    })
})()
