if (!localStorage.getItem('selected-tab')) {
    localStorage.setItem('selected-tab', 'upload-images');
}

const imageContainer = document.querySelector('.image-container');
const videoContainer = document.querySelector('.video-container');

const createStream = () => {
    const videoElement = document.createElement('video');
    videoElement.id = 'inputVideo';
    videoElement.width = 720;
    videoElement.height = 560;
    videoElement.autoplay = true;
    videoElement.muted = true;

    videoElement.addEventListener("play", () => {
        const canvas = videoContainer.querySelector('canvas') ?? faceapi.createCanvasFromMedia(videoElement);
        if (!videoContainer.querySelector('canvas')) {
            videoContainer.append(canvas);
        }

        const displaySize = { width: videoElement.width, height: videoElement.height };
        faceapi.matchDimensions(canvas, displaySize);

        setInterval(async () => {
            const detections = await faceapi
                .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions();
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
        }, 100);
    });

    videoContainer.appendChild(videoElement);

    const playCam = () => {
        const mediaDevices = (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ?
            navigator.mediaDevices : ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia) ? {
                getUserMedia: function(c) {
                    return new Promise(function(y, n) {
                        (navigator.mozGetUserMedia ||
                            navigator.webkitGetUserMedia).call(navigator, c, y, n);
                    });
                }
            } : null);

        mediaDevices.getUserMedia({
            audio: false,
            video: {}
        })
            .then((stream) => (videoElement.srcObject = stream))
            .catch(console.error);
    }

    const pausePlayButton = document.createElement('button');
    pausePlayButton.innerText = 'Pause';
    pausePlayButton.setAttribute('type', 'button');
    pausePlayButton.setAttribute('data-action', 'pause');

    pausePlayButton.addEventListener('click', () => {
        if (pausePlayButton.getAttribute('data-action') === 'pause') {
            videoElement.pause();
            pausePlayButton.innerText = 'Play';
            pausePlayButton.setAttribute('data-action', 'play');
        } else {
            videoElement.play();
            pausePlayButton.innerText = 'Pause';
            pausePlayButton.setAttribute('data-action', 'pause');
        }
    });

    videoContainer.appendChild(pausePlayButton);

    (async () => {
        Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri("./assets/models"),
            faceapi.nets.faceLandmark68Net.loadFromUri("./assets/models"),
            faceapi.nets.faceRecognitionNet.loadFromUri("./assets/models"),
            faceapi.nets.faceExpressionNet.loadFromUri("./assets/models"),
        ]).then(playCam);
    })();
};

const createImageUploader = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.name = 'uploadField';
    input.id = 'uploadField';
    input.classList.add('uploadField');
    imageContainer.appendChild(input);

    const uploadedImages = document.createElement('div');
    uploadedImages.classList.add('uploadedImage');
    imageContainer.appendChild(uploadedImages);

    const uploadedFile = document.querySelector('#uploadField');
    const uploadedImageDiv = document.querySelector('.uploadedImage');

    const MODELS_LOCATION = './assets/models';
    let modelsLoaded = [];

    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_LOCATION).then(() => {
        modelsLoaded = [...modelsLoaded, 'tinyFaceDetector loaded'];
    });
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_LOCATION).then(() => {
        modelsLoaded = [...modelsLoaded, 'ssdMobilenetv1 loaded'];
    });

    const processImage = ({ image, imageDimensions }) => {
        if (modelsLoaded.length !== 2) {
            return;
        }

        faceapi.detectAllFaces(image).then(facesDetected => {
            console.log(facesDetected);
            const facesDetectedImage = faceapi.resizeResults(image, imageDimensions);
            const canvas = faceapi.createCanvasFromMedia(facesDetectedImage);
            faceapi.draw.drawDetections(canvas, facesDetected);
            uploadedImageDiv.appendChild(canvas);

            canvas.style.position = 'absolute';
            canvas.style.top = uploadedImageDiv.firstChild.y + 'px';
            canvas.style.left = uploadedImageDiv.firstChild.x + 'px';

            if (imageDimensions.width > 1000 && imageDimensions.height > 1000) {
                canvas.style.width = `calc(${imageDimensions.width}px / 2)`;
            }

            image.remove();

            facesDetected.map(face => {
                faceapi.draw.drawDetections(canvas, face);
            })
        });
    }

    const getImage = function() {
        uploadedImageDiv.innerHTML = '';
        const imageToProcess = this.files[0];
        console.log('image', imageToProcess);

        const image = new Image(imageToProcess.width, imageToProcess.height);
        image.src = URL.createObjectURL(imageToProcess);
        uploadedImageDiv.appendChild(image);

        image.addEventListener('load', () => {
            const data = {
                image,
                imageDimensions: {
                    width: image.width,
                    height: image.height
                }
            }
            processImage(data);
        })

    };

    uploadedFile.addEventListener('change', getImage, false);
};

document.querySelector('.upload-images').addEventListener('click', () => {
    localStorage.setItem('selected-tab', 'upload-images');
    document.querySelector('.upload-images').parentElement.classList.add('active');
    videoContainer.innerHTML = '';
    createImageUploader();
});

document.querySelector('.stream').addEventListener('click', () => {
    localStorage.setItem('selected-tab', 'stream');
    document.querySelector('.stream').parentElement.classList.add('active');
    imageContainer.innerHTML = '';
    createStream();
});

if (localStorage.getItem('selected-tab') === 'upload-images') {
    document.querySelector('.upload-images').parentElement.classList.add('active');
    imageContainer.classList.add('active');
    createImageUploader();
} else {
    document.querySelector('.stream').parentElement.classList.add('active');
    videoContainer.classList.add('active');
    createStream();
}
