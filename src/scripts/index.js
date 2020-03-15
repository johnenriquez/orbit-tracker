// TODO:
// make values dynamic
// clean up code; make modular for repeatable sat renders
// build UI
// add observation location
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const RADIUS_EARTH = 637.1;

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
let satLat = obsLat;
let satLng = obsLng;
let satName = "SPACE STATION";



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
camera.position.z = 1200;


// set up scene
const scene = new THREE.Scene();


// add lighting

// main light
const color = 0xFFFFFF;
const intensity = 0.7;
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

// ambient light 
const ambColor = 0xffffff;
const ambIntensity = 0.5;
const ambLight = new THREE.AmbientLight(ambColor, ambIntensity);
ambLight.castSahdow = true;
scene.add(ambLight);

// earth/sat parent
const earthGroup = new THREE.Object3D();
scene.add(earthGroup);

// add the earth
const earthGeo = new THREE.SphereGeometry(RADIUS_EARTH, 75, 75);
const earthMat = new THREE.MeshPhongMaterial();
earthMat.map = new THREE.TextureLoader().load("images/2k_earth_daymap.jpg");
// earthMat.map = new THREE.TextureLoader().load('images/earthmap1k.jpg');
// earthMat.bumpMap = new THREE.TextureLoader().load('images/elev_bump_16ka.jpg');
// earthMat.bumpScale = 50;
// earthMat.specularMap = new THREE.TextureLoader().load('images/earthspec1k.jpg');
earthMat.specular = new THREE.Color('#2e2e2e');
const earthMesh = new THREE.Mesh(earthGeo, earthMat);
earthMesh.castShadow = true;
earthMesh.receiveShadow = true;
// rotate earth so center faces camera
earthMesh.rotation.y = - Math.PI / 2;
earthGroup.add(earthMesh);

// sat/satLight parent
const satGroup = new THREE.Object3D();
earthGroup.add(satGroup);

// sat
const satGeo = new THREE.BoxGeometry(8, 8, 8);
const satMat = new THREE.MeshLambertMaterial({ color: 0x00FFFF, reflectivity: 1 });
const satMesh = new THREE.Mesh(satGeo, satMat);
satMesh.castShadow = true;
satMesh.receiveShadow = true;
let satAltitude = 41.7;
satMesh.position.set(0, 0, RADIUS_EARTH + satAltitude);
satGroup.add(satMesh);

function makeLabelCanvas(size, name) {
  const borderSize = 2;
  const ctx = document.createElement("canvas").getContext("2d");
  const font = `${size}px helvetica, arial, sans-serif`;
  ctx.font = font;
  const doubleBorderSize = borderSize * 2;
  const width = ctx.measureText(name).width + doubleBorderSize;
  const height = ctx.measureText(name).width + doubleBorderSize;
  // const height = size;
  ctx.canvas.width = width;
  ctx.canvas.height = height;

  // need to set font again after resizing canvas
  ctx.font = font;
  ctx.textBaseline = "top";

  // ctx.fillStyle = "black";
  // ctx.fillRect(0, 0, width, size);
  ctx.fillStyle = "white";
  ctx.fillText(name, 10, 10);

  return ctx.canvas;
}

const labelCanvas = makeLabelCanvas(100, satName);
const labelTexture = new THREE.CanvasTexture(labelCanvas);
// because our canvas is likely not a power of 2
// in both dimensions set the filtering appropriately.
labelTexture.minFilter = THREE.LinearFilter;
labelTexture.wrapS = THREE.ClampToEdgeWrapping;
labelTexture.wrapT = THREE.ClampToEdgeWrapping;
const labelMaterial = new THREE.SpriteMaterial({
  map: labelTexture,
  transparent: true
});
const label = new THREE.Sprite(labelMaterial);
label.scale.set(150,150,150);
satMesh.add(label);
// label.position.y = 0.6;
// label.position.z = 1;


// sat glow
const satLightColor = 0x00ffff;
const satLightIntensity = 0.7;
const satLight = new THREE.PointLight(satLightColor, satLightIntensity);
satMesh.add(satLight);
satLight.position.z = 10;



const degToRad = deg => (deg * Math.PI) / 180;
satGroup.rotation.x = degToRad(satLat);
satGroup.rotation.y = degToRad(satLng);




// let r = RADIUS_EARTH + satAltitude;

// let alt = satAltitude*10000;
// let lat = degToRad(0);
// let lon = degToRad(0);

// // http://www.mathworks.de/help/toolbox/aeroblks/llatoecefposition.html
// let rad = 6378137.0; // earth radius in meters
// let f = (1.0/298.257223563); // flattening factor WGS84 Model
// let cosLat = Math.cos(lat);
// let sinLat = Math.sin(lat);
// let FF = (1.0 - f) ** 2;
// let C = 1 / Math.sqrt(cosLat ** 2 + FF * sinLat ** 2);
// let S = C * FF;

// let x = (rad * C + alt) * cosLat * Math.cos(lon) / 10000;
// let y = (rad * C + alt) * cosLat * Math.sin(lon) / 10000;
// let z = (rad * S + alt) * sinLat / 10000;

// satGroup.position.set(x, y, z);


// move the stuff
// earthGroup.rotation.y = Math.PI / 2;

// add stars
const starGeo = new THREE.SphereGeometry(3000, 20, 100);
// const starMat = new THREE.MeshPhongMaterial({ color: 0x999999 });
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
controls.autoRotate = true;

// rendering
function render() {
  // did aspect ratio / viewport change?
  if (resizeRendererToDisplaySize(renderer)) {
    // maintain camera render aspect ratio
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  renderer.render(scene, camera);
}

// run the animation
function animate(time) {
  requestAnimationFrame(animate);
  // controls.update();
  var delta = clock.getDelta();
  earthGroup.rotation.y += 0.05 * delta;
  render();
}
animate();