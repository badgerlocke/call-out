const deleteBtn = document.querySelectorAll('.del')
const checkInBtn = document.querySelectorAll('.checkIn')

// document.querySelector('#due').innerHTML

Array.from(deleteBtn).forEach((el)=>{
    el.addEventListener('click', deleteTodo)
})

Array.from(checkInBtn).forEach((el)=>{
    el.addEventListener('click', checkIn)
})

async function checkIn(){
    const tripId = this.dataset.id
    console.log(this.dataset.id)
    try{
        const response = await fetch('trips/checkIn', {
            method: 'put',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({
                'todoIdFromJSFile': tripId
            })
        })
        const data = await response.json()
        console.log(data)
        location.reload()
    }catch(err){
        console.log(err)
    }
}


//TODO: add delete buttons
async function deleteTrip(){
    const tripId = this.parentNode.dataset.id
    try{
        const response = await fetch('todos/deleteTodo', {
            method: 'delete',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({
                'todoIdFromJSFile': tripId
            })
        })
        const data = await response.json()
        console.log(data)
        location.reload()
    }catch(err){
        console.log(err)
    }
}



// *************************
// DARK MODE 
// *************************

// const checkbox =
// document.getElementById('checkbox');

// checkbox.addEventListener('change', () => {
// // change the theme of the website

// document.body.classList.toggle('dark');
// });


