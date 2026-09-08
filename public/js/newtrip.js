const tripForm = document.querySelector('#newTripForm')

if (tripForm) {
    const dateInput = tripForm.querySelector('#returnDate')
    const timeInput = tripForm.querySelector('#returnTimeOfDay')
    const returnTimeInput = tripForm.querySelector('#returnTime')
    const notifyToggle = tripForm.querySelector('#notify')
    const notifyFields = tripForm.querySelector('#notifyFields')
    const offsetValue = tripForm.querySelector('#notifyOffsetValue')
    const offsetUnit = tripForm.querySelector('#notifyOffsetUnit')
    const preview = tripForm.querySelector('#notifyPreview')

    const unitMs = {
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    })

    //Default to today so a same-day trip only needs a time
    if (!dateInput.value) {
        const today = new Date()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        dateInput.value = `${today.getFullYear()}-${month}-${day}`
        dateInput.min = dateInput.value
    }

    function getReturnDate() {
        if (!dateInput.value || !timeInput.value) return null
        const combined = new Date(`${dateInput.value}T${timeInput.value}`)
        return isNaN(combined) ? null : combined
    }

    function getNotifyDate() {
        const returning = getReturnDate()
        const amount = Number(offsetValue.value)
        if (!returning || !amount || amount <= 0) return null
        return new Date(returning.getTime() + amount * unitMs[offsetUnit.value])
    }

    function setNotifyEnabled(on) {
        notifyFields.hidden = !on
        offsetValue.required = on
        offsetValue.disabled = !on
        offsetUnit.disabled = !on
    }

    function update() {
        const returning = getReturnDate()
        //Send the exact instant so the server doesn't have to guess a time zone
        returnTimeInput.value = returning ? returning.toISOString() : ''

        const notifyOn = notifyToggle.checked
        setNotifyEnabled(notifyOn)

        if (!notifyOn) {
            preview.textContent = ''
            return
        }

        const notifyAt = getNotifyDate()
        preview.textContent = notifyAt
            ? `We'll contact them at ${formatter.format(notifyAt)} if you haven't checked in.`
            : ''
    }

    for (const el of [dateInput, timeInput, offsetValue, offsetUnit, notifyToggle]) {
        el.addEventListener('input', update)
        el.addEventListener('change', update)
    }
    tripForm.addEventListener('submit', update)

    update()
}
