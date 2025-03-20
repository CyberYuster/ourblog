document.getElementById('addAttachment').addEventListener('click', function () {
    document.getElementById('attachment').click();
});

document.getElementById('attachment').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const attachmentPreview = document.getElementById('attachmentPreview');
            if (file.type.startsWith('image/')) {
                attachmentPreview.innerHTML = `<img src="${event.target.result}" alt="${file.name}">`;
            } else {
                attachmentPreview.innerHTML = `<p>File: ${file.name}</p>`;
              
            }
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('emailForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const subject = document.getElementById('subject').value;
    const body = document.getElementById('body').value;
    const attachment = document.getElementById('attachment').files[0];

    // Simulate sending the email (you would need a backend for actual functionality)
    console.log('Subject:', subject);
    console.log('Body:', body);
    if (attachment) {
        console.log('Attachment:', attachment.name);
    }
    alert('Email sent successfully!');
});