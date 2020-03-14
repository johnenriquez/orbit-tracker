import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// XHR, Promise style
var makeRequest = function (url, method) {
  var request = new XMLHttpRequest();
  return new Promise(function (resolve, reject) {
    request.onreadystatechange = function () {
      // Only run if the request is complete
      if (request.readyState !== 4) return;
      // Process the response
      if (request.status >= 200 && request.status < 300) {
        // Success
        resolve(request);
      } else {
        // Failure
        reject({
          status: request.status,
          statusText: request.statusText
        });
      }
    };
    request.open(method || 'GET', url, true);
    request.send();
  });
};  

// Create and send a GET request
// The first argument is the post type (GET, POST, PUT, DELETE, etc.)
// The second argument is the endpoint URL
let satId = 25544; // ISS
let obsLat = 37.67;
let obsLng = -122.47;
let obsAlt = 0;
let numSamples = 3;
let apiKey = "Y8WB5D-Y893UH-5V68FF-4BOJ";
let apiBase = "https://www.n2yo.com/rest/v1/satellite/positions"
let apiUrl = `${apiBase}/${satId}/${obsLat}/${obsLng}/${obsAlt}/${numSamples}?apiKey=${apiKey}`;
makeRequest(apiUrl)
  .then(function (data) {
    console.log('Success!', data.response);
  })
  .catch(function (error) {
    console.log('Something went wrong', error);
  });



// =======================================================================

// set up the canvas and renderer
const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

// set up clock
const clock = new THREE.Clock()

// set up camera
const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const near = 0.1;
const far = 10000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 600;


// set up scene
const scene = new THREE.Scene();


// add lighting
const color = 0xFFFFFF;
const intensity = 1;
const distance = 0;
const angle = Math.PI / 2;
const penumbra = 1;

const light = new THREE.SpotLight(
  color,
  intensity,
  distance,
  angle,
  penumbra
  );
light.position.set(2000, 4000, 3000);
light.target.position.set(0,0,0);
light.castSahdow = true;
scene.add(light);

// add the earth
const earthGeo = new THREE.SphereGeometry(200, 400, 400);
const earthMat = new THREE.MeshPhongMaterial();
earthMat.map = new THREE.TextureLoader().load('images/earthmap1k.jpg');
earthMat.bumpMap = new THREE.TextureLoader().load('images/elev_bump_16ka.jpg');
earthMat.bumpScale = 8;
earthMat.specularMap = new THREE.TextureLoader().load('images/earthspec1k.jpg');
earthMat.specular = new THREE.Color('#2e2e2e');
const earthMesh = new THREE.Mesh(earthGeo, earthMat);
earthMesh.castShadow = true;
earthMesh.receiveShadow = true;
scene.add(earthMesh);

// add stars
const starGeo = new THREE.SphereGeometry(3000, 20, 100);
const starMat = new THREE.MeshBasicMaterial();
starMat.map = new THREE.TextureLoader().load('images/star-field.png');
starMat.side = THREE.BackSide;
var starMesh = new THREE.Mesh(starGeo, starMat);
scene.add(starMesh);

// resize canvas and renderer
function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

// controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;
// controls.autoRotate = true;

// render
function render() {
  // did aspect ratio / viewport change?
  if (resizeRendererToDisplaySize(renderer)) {
    // maintain camera render aspect ratio
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
  renderer.render(scene, camera);
}

// run the animation
function animate(time) {
  requestAnimationFrame(animate);
  controls.update();
  var delta = clock.getDelta();
  earthMesh.rotation.y += 0.1 * delta;
  render();
}
animate();