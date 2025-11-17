// Toast Notification System
const toast = document.getElementById('encouragementToast');
const toastMessage = document.getElementById('toastMessage');

const encouragingMessages = [
    "You're doing amazing",
    "Keep up the great work",
    "You've got this",
    "Believe in yourself",
    "You're making progress",
    "Stay positive",
    "You're stronger than you think",
    "Every moment counts",
    "You're capable of amazing things",
    "Keep pushing forward",
    "Your potential is limitless",
    "You're on the right path",
    "Trust the process",
    "You're making a difference",
    "Stay focused and shine",
    "Small steps lead to big wins",
    "You inspire others",
    "Keep being awesome",
    "Your hard work pays off",
    "You're unstoppable"
];

function showToast() {
    const randomMessage = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
    toastMessage.textContent = randomMessage;

    // Reset to default state (bottom position)
    toast.classList.remove('hide');
    toast.classList.remove('show');

    // Small delay to ensure the browser renders the default state
    setTimeout(() => {
        toast.classList.add('show');
    }, 50);

    setTimeout(() => {
        // Keep show class and add hide to trigger out animation
        toast.classList.add('hide');
    }, 4000);
}

// Show toast every 10 seconds
setInterval(showToast, 10000);

// Show first toast after 2 seconds
setTimeout(showToast, 2000);
