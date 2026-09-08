// A "show password" checkbox flips its form's password fields to plain text.
// Fields are marked with data-password because input[type="password"] stops
// matching once the type is switched.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-show-password]').forEach((toggle) => {
        toggle.addEventListener('change', () => {
            toggle
                .closest('form')
                .querySelectorAll('input[data-password]')
                .forEach((input) => {
                    input.type = toggle.checked ? 'text' : 'password'
                })
        })
    })
})
