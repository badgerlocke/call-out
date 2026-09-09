const tripForm = document.querySelector('#newTripForm')
const newTripModal = document.getElementById('new-trip-modal')

function todayInputValue() {
    const today = new Date()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${today.getFullYear()}-${month}-${day}`
}

function bindTripForm(form) {
    const dateInput = form.querySelector('#returnDate')
    const timeInput = form.querySelector('#returnTimeOfDay')
    const returnTimeInput = form.querySelector('#returnTime')
    const notifyToggle = form.querySelector('#notify')
    const notifyFields = form.querySelector('#notifyFields')
    const offsetValue = form.querySelector('#notifyOffsetValue')
    const offsetUnit = form.querySelector('#notifyOffsetUnit')
    const preview = form.querySelector('#notifyPreview')

    const unitMs = {
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    })

    if (dateInput && !dateInput.value) {
        dateInput.value = todayInputValue()
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
    form.addEventListener('submit', update)

    update()
    return { update, getReturnDate, getNotifyDate, formatter }
}

function bindNewTripWizard(form, helpers) {
    const wizard = form.querySelector('#new-trip-wizard')
    const full = form.querySelector('#new-trip-full')
    if (!wizard || !full) return

    const steps = ['type', 'date', 'time', 'notify', 'notifyWhen', 'place', 'visibility']
    let stepIndex = 0
    const visibilityDefault = form.dataset.visibilityDefault === 'friends' ? 'friends' : 'private'
    const state = {
        tripType: '',
        dateChoice: '',
        notify: null,
        visibility: visibilityDefault
    }

    const otherDateWrap = wizard.querySelector('[data-other-date]')
    const otherDateInput = wizard.querySelector('[data-wizard="otherDate"]')
    const timeInput = wizard.querySelector('[data-wizard="time"]')
    const offsetValue = wizard.querySelector('[data-wizard="offsetValue"]')
    const offsetUnit = wizard.querySelector('[data-wizard="offsetUnit"]')
    const wizardPreview = wizard.querySelector('[data-wizard="notifyPreview"]')
    const locationInput = wizard.querySelector('[data-wizard="location"]')
    const detailsInput = wizard.querySelector('[data-wizard="details"]')

    const named = {
        tripType: form.querySelector('#tripType'),
        location: form.querySelector('#location'),
        details: form.querySelector('#details'),
        returnDate: form.querySelector('#returnDate'),
        returnTimeOfDay: form.querySelector('#returnTimeOfDay'),
        notify: form.querySelector('#notify'),
        offsetValue: form.querySelector('#notifyOffsetValue'),
        offsetUnit: form.querySelector('#notifyOffsetUnit'),
        visibilityPrivate: form.querySelector('#visibilityPrivate'),
        visibilityFriends: form.querySelector('#visibilityFriends')
    }

    function currentStepName() {
        return steps[stepIndex]
    }

    function setSelected(buttons, value) {
        for (const btn of buttons) {
            const on = btn.dataset.value === value
            btn.classList.toggle('btn-primary', on)
            btn.classList.toggle('btn-outline', !on)
            btn.setAttribute('aria-pressed', String(on))
        }
    }

    function stepEl(name) {
        return wizard.querySelector(`[data-wizard-step="${name}"]`)
    }

    function nextButton(section) {
        return section.querySelector('.js-wizard-next')
    }

    function syncNamedFields() {
        if (state.tripType) named.tripType.value = state.tripType
        named.location.value = locationInput.value.trim()
        named.details.value = detailsInput.value

        if (state.dateChoice === 'today') {
            named.returnDate.value = todayInputValue()
        } else if (state.dateChoice === 'other' && otherDateInput.value) {
            named.returnDate.value = otherDateInput.value
        }

        if (timeInput.value) named.returnTimeOfDay.value = timeInput.value

        named.notify.checked = state.notify !== false
        if (state.notify === false) named.notify.checked = false

        named.offsetValue.value = offsetValue.value
        named.offsetUnit.value = offsetUnit.value
        if (named.visibilityPrivate && named.visibilityFriends) {
            named.visibilityFriends.checked = state.visibility === 'friends'
            named.visibilityPrivate.checked = state.visibility !== 'friends'
        }
        helpers.update()
    }

    function updateWizardPreview() {
        syncNamedFields()
        const notifyAt = helpers.getNotifyDate()
        wizardPreview.textContent = notifyAt
            ? `We'll contact them at ${helpers.formatter.format(notifyAt)} if you haven't checked in.`
            : ''
    }

    function canContinue() {
        const step = currentStepName()
        if (step === 'type') return Boolean(state.tripType)
        if (step === 'date') {
            if (state.dateChoice === 'today') return true
            return state.dateChoice === 'other' && Boolean(otherDateInput.value)
        }
        if (step === 'time') return Boolean(timeInput.value)
        if (step === 'notify') return state.notify === true || state.notify === false
        if (step === 'notifyWhen') return Number(offsetValue.value) > 0
        if (step === 'place') return Boolean(locationInput.value.trim())
        if (step === 'visibility') return state.visibility === 'private' || state.visibility === 'friends'
        return true
    }

    function refreshStepButtons() {
        const section = stepEl(currentStepName())
        const next = nextButton(section)
        if (next) next.disabled = !canContinue()
    }

    function showStep(index) {
        stepIndex = index
        for (const name of steps) {
            const el = stepEl(name)
            if (el) el.hidden = name !== currentStepName()
        }
        refreshStepButtons()
        if (currentStepName() === 'notifyWhen') updateWizardPreview()
        if (currentStepName() === 'visibility') {
            setSelected(wizard.querySelectorAll('.js-visibility-choice'), state.visibility)
        }
    }

    function nextStep() {
        if (!canContinue()) return
        syncNamedFields()
        let next = stepIndex + 1
        if (currentStepName() === 'notify' && state.notify === false) {
            next = steps.indexOf('place')
        }
        showStep(next)
    }

    function prevStep() {
        let prev = stepIndex - 1
        if (currentStepName() === 'place' && state.notify === false) {
            prev = steps.indexOf('notify')
        }
        if (prev >= 0) showStep(prev)
    }

    function setFullFormRequired(on) {
        named.returnDate.required = on
        named.returnTimeOfDay.required = on
        named.location.required = on
        named.offsetValue.required = on && named.notify.checked
        form.noValidate = !on
    }

    function showFullForm() {
        syncNamedFields()
        form.dataset.mode = 'full'
        wizard.hidden = true
        full.hidden = false
        setFullFormRequired(true)
        helpers.update()
        named.location.focus()
    }

    function showWizard() {
        form.dataset.mode = 'wizard'
        wizard.hidden = false
        full.hidden = true
        setFullFormRequired(false)
        showStep(0)
    }

    function resetWizard() {
        state.tripType = ''
        state.dateChoice = ''
        state.notify = null
        state.visibility = visibilityDefault
        otherDateInput.value = ''
        otherDateWrap.classList.add('hidden')
        timeInput.value = ''
        offsetValue.value = '2'
        offsetUnit.value = 'hours'
        locationInput.value = ''
        detailsInput.value = ''
        named.location.value = ''
        named.details.value = ''
        named.returnDate.value = todayInputValue()
        named.returnTimeOfDay.value = ''
        named.notify.checked = true
        named.offsetValue.value = '2'
        named.offsetUnit.value = 'hours'
        named.tripType.selectedIndex = 0
        setSelected(wizard.querySelectorAll('.js-trip-type'), '')
        setSelected(wizard.querySelectorAll('.js-return-date'), '')
        setSelected(wizard.querySelectorAll('.js-notify-choice'), '')
        setSelected(wizard.querySelectorAll('.js-visibility-choice'), state.visibility)
        showWizard()
        helpers.update()
    }

    wizard.querySelectorAll('.js-trip-type').forEach((btn) => {
        btn.addEventListener('click', () => {
            state.tripType = btn.dataset.value
            setSelected(wizard.querySelectorAll('.js-trip-type'), state.tripType)
            refreshStepButtons()
        })
    })

    wizard.querySelectorAll('.js-return-date').forEach((btn) => {
        btn.addEventListener('click', () => {
            state.dateChoice = btn.dataset.value
            setSelected(wizard.querySelectorAll('.js-return-date'), state.dateChoice)
            const other = state.dateChoice === 'other'
            otherDateWrap.classList.toggle('hidden', !other)
            if (!other) otherDateInput.value = ''
            if (other) {
                otherDateInput.min = todayInputValue()
                otherDateInput.focus()
            }
            refreshStepButtons()
        })
    })

    otherDateInput.addEventListener('input', refreshStepButtons)
    timeInput.addEventListener('input', refreshStepButtons)
    locationInput.addEventListener('input', refreshStepButtons)

    wizard.querySelectorAll('.js-notify-choice').forEach((btn) => {
        btn.addEventListener('click', () => {
            state.notify = btn.dataset.value === 'yes'
            setSelected(wizard.querySelectorAll('.js-notify-choice'), btn.dataset.value)
            refreshStepButtons()
        })
    })

    wizard.querySelectorAll('.js-visibility-choice').forEach((btn) => {
        btn.addEventListener('click', () => {
            state.visibility = btn.dataset.value
            setSelected(wizard.querySelectorAll('.js-visibility-choice'), state.visibility)
            refreshStepButtons()
        })
    })

    offsetValue.addEventListener('input', updateWizardPreview)
    offsetUnit.addEventListener('change', updateWizardPreview)

    wizard.querySelectorAll('.js-wizard-next').forEach((btn) => {
        btn.addEventListener('click', nextStep)
    })
    wizard.querySelectorAll('.js-wizard-back').forEach((btn) => {
        btn.addEventListener('click', prevStep)
    })
    wizard.querySelectorAll('.js-skip-wizard').forEach((btn) => {
        btn.addEventListener('click', showFullForm)
    })

    form.addEventListener('submit', (event) => {
        if (form.dataset.mode !== 'wizard') return
        if (currentStepName() !== 'visibility') {
            event.preventDefault()
            return
        }
        if (!locationInput.value.trim() || !timeInput.value) {
            event.preventDefault()
            locationInput.focus()
            return
        }
        syncNamedFields()
    }, true)

    resetWizard()
    return { resetWizard, showFullForm, showWizard }
}

if (tripForm) {
    const helpers = bindTripForm(tripForm)
    const wizard = bindNewTripWizard(tripForm, helpers)

    function openNewTripModal() {
        if (!newTripModal) return
        if (wizard) wizard.resetWizard()
        newTripModal.showModal()
    }

    document.addEventListener('click', (event) => {
        const el = event.target.closest('.js-open-new-trip')
        if (!el || !newTripModal || !newTripModal.showModal) return
        event.preventDefault()
        openNewTripModal()
    })

    if (newTripModal) {
        const params = new URLSearchParams(window.location.search)
        if (params.has('newTrip') || window.location.hash === '#new-trip') {
            openNewTripModal()
            if (params.has('newTrip')) {
                params.delete('newTrip')
                const search = params.toString()
                const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
                history.replaceState({}, '', next)
            }
        }
    }
}
