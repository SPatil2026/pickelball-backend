import fs from 'fs/promises';

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNDg0YjJiNmEtYTIxNi00YjJkLThhOWUtNGE0ZWI5MGY2YTE2Iiwicm9sZSI6Ik9XTkVSIiwiZW1haWwiOiJzYW1AZXhhbXBsZS5jb20iLCJpYXQiOjE3NzM5ODg2NjksImV4cCI6MTc3NDU5MzQ2OX0.ojZZfzKojcjZYDVk5OPrgF0QcqFaIggodgpwN5Wa5xI";
const venue_id = "bdb28452-c18e-40f3-ad14-ecbeb3efa2ac";

async function uploadImages() {
    try {
        const formData = new FormData();
        formData.append('venue_id', venue_id);

        const images = ['i1.png', 'i2.jpeg', 'i3.jpeg', 'i4.jpeg', 'i5.png', 'i6.jpeg'];

        for (const imageName of images) {
            const imageBuffer = await fs.readFile(`scripts/${imageName}`);
            const type = imageName.endsWith('.png') ? 'image/png' : 'image/jpeg';
            const blob = new Blob([imageBuffer], { type });
            formData.append('images', blob, imageName);
        }

        const response = await fetch('http://localhost:8000/api/owner/upload-venue-images', {
            method: 'POST',
            body: formData,
            headers: {
                Cookie: `auth_token=${token}`
            }
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Data:", data);
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

uploadImages();
