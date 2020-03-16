import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as ApiUtil from "./api_util";

// move to a constants file?
const API_KEY = "Y8WB5D-Y893UH-5V68FF-4BOJ";
const API_BASE = "https://www.n2yo.com/rest/v1/satellite/positions";
const RADIUS_EARTH = 6371;

// number of footprint samples
let NUM_SAMPLES = 240;

const toScale = num => num / 10;
const degToRad = deg => (deg * Math.PI) / 180;

class OrbitTracker {
  constructor(options) {
    this.canvas = options.canvas;
    this.satId = options.satId || 25544; // ISS
    this.obsLat = options.obsLat || 37.67; // SF coords
    this.obsLng = options.obsLng || -122.47;
    this.obsAlt = options.obsAlt || 0;
    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true
    });
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    this.loading = true;
  }

  newWorldLights() {
    const worldLights = new THREE.Object3D();
    // main light
    const color = 0xffffff;
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
    light.target.position.set(0, 0, 0);
    light.castSahdow = true;
    worldLights.add(light);

    // ambient light
    const ambColor = 0xffffff;
    const ambIntensity = 0.5;
    const ambLight = new THREE.AmbientLight(ambColor, ambIntensity);
    ambLight.castSahdow = true;
    worldLights.add(ambLight);

    return worldLights;
  }

  newCamera() {
    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 10000;
    return new THREE.PerspectiveCamera(fov, aspect, near, far);
  }

  newEarth() {
    // the parent
    const earthGroup = new THREE.Object3D();

    // the earth with diffuse map
    const earthGeo = new THREE.SphereGeometry(toScale(RADIUS_EARTH), 75, 75);
    const earthMat = new THREE.MeshPhongMaterial();
    // earthMat.map = new THREE.TextureLoader().load('images/earthmap1k.jpg');
    earthMat.map = new THREE.TextureLoader().load("images/2k_earth_daymap.jpg");

    // add bump map
    // earthMat.bumpMap = new THREE.TextureLoader().load('images/elev_bump_16ka.jpg');
    // earthMat.bumpScale = 50;

    // add specular map
    // earthMat.specularMap = new THREE.TextureLoader().load('images/earthspec1k.jpg');
    // earthMat.specular = new THREE.Color("#2e2e2e");

    // mesh
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.castShadow = true;
    earthMesh.receiveShadow = true;
    // rotate earth so 0'0" lines up with origin
    earthMesh.rotation.y = -Math.PI / 2;

    // add to parent and return
    earthGroup.add(earthMesh);
    return earthGroup;
  }

  makeLabelCanvas(size, name) {
    // frankly i'm not sure how this is working properly lol
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

  newLabel(size, labelName, scale) {
    const labelCanvas = this.makeLabelCanvas(size, labelName);
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
    label.scale.set(scale, scale, scale);
    return label;
  }

  newSatObject(options) {
    // params
    let { satName, satAltitude, satLatitude, satLongitude } = options;
    let style = options.style || "secondary";

    // internal vars
    let satGeo, satMat, satLightColor, satLightIntensity, withLabel;
    if (style === "primary") {
      satGeo = new THREE.BoxGeometry(8, 8, 8);
      satMat = new THREE.MeshLambertMaterial({
        color: 0x00ffff,
        reflectivity: 1
      });
      satLightColor = 0x00ffff;
      satLightIntensity = 0.7;
      withLabel = true;
    } else {
      satGeo = new THREE.BoxGeometry(1, 1, 1);
      satMat = new THREE.MeshBasicMaterial({
        color: 0xffff00
      });
      satLightColor = 0xffff00;
      withLabel = false;
    }

    // parent
    const satGroup = new THREE.Object3D();

    // mesh
    const satMesh = new THREE.Mesh(satGeo, satMat);
    satMesh.castShadow = true;
    satMesh.receiveShadow = true;

    // glow
    if (style === "primary") {
      const satLight = new THREE.PointLight(satLightColor, satLightIntensity);
      satMesh.add(satLight);
      satLight.position.z = 10;
    }

    // label
    if (withLabel) {
      const labelObj = this.newLabel(100, satName, 150);
      satMesh.add(labelObj);
    }

    // add to parent
    satGroup.add(satMesh);

    // position it
    satMesh.position.set(0, 0, toScale(RADIUS_EARTH) + toScale(satAltitude));
    satGroup.rotation.x = degToRad(-satLatitude);
    satGroup.rotation.y = degToRad(satLongitude);

    return satGroup;
  }

  newStarBackground() {
    const starGeo = new THREE.SphereGeometry(3000, 20, 100);
    // const starMat = new THREE.MeshPhongMaterial({ color: 0x999999 });
    const starMat = new THREE.MeshBasicMaterial();
    starMat.map = new THREE.TextureLoader().load("images/star-field.png");
    starMat.side = THREE.BackSide;
    const starMesh = new THREE.Mesh(starGeo, starMat);
    return starMesh;
  }

  getSatInfo(satId, obsLat, obsLng, obsAlt) {
    let apiUrl = `${API_BASE}/${satId}/${obsLat}/${obsLng}/${obsAlt}/${NUM_SAMPLES}?apiKey=${API_KEY}`;
    return ApiUtil.makeRequest(apiUrl);
  }

  start() {
    // set up camera
    this.camera = this.newCamera();
    this.camera.position.z = 1200;

    // mouse/touch controls
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.autoRotate = true;

    // add loading screen
    const loadingModal = document.createElement("div");
    loadingModal.classList.add("loadingModal");
    loadingModal.innerHTML = "Loading Satellite..."
    document.body.appendChild(loadingModal);

    // set up scene
    this.scene = new THREE.Scene();

    // add lighting
    const worldLights = this.newWorldLights();
    this.scene.add(worldLights);

    // add earth
    this.earth = this.newEarth();
    this.scene.add(this.earth);

    // add stars
    const starBackground = this.newStarBackground();
    this.scene.add(starBackground);

    // add satellites
    this.getSatInfo(this.satId, this.obsLat, this.obsLng, this.obsAlt)
      .then(data => {
        // no more loading
        let loadingModal = document.querySelector(".loadingModal");
        loadingModal.parentNode.removeChild(loadingModal);

        // get info
        let { info, positions } = JSON.parse(data.response);

        // primary satellite
        let position = positions[0];
        const primarySat = this.newSatObject({
          satName: info.satname,
          satAltitude: position.sataltitude,
          satLatitude: position.satlatitude,
          satLongitude: position.satlongitude,
          style: "primary"
        });
        this.earth.add(primarySat);
        // show info
        let satInfo = document.createElement("div");
        satInfo.classList.add("ui");
        satInfo.classList.add("ui-sat-info");
        let infoSatName = document.createElement("h2");
        infoSatName.innerHTML = info.satname;
        satInfo.appendChild(infoSatName);
        let infoList = document.createElement("ul");
        satInfo.appendChild(infoList);
        const newInfoItem = (key, val) => {
          let item = document.createElement("li");
          let keyElement = document.createElement("strong");
          keyElement.innerHTML = key;
          item.appendChild(keyElement);
          let valElement = document.createElement("span");
          valElement.innerHTML = val;
          item.appendChild(valElement);
          return item;
        }
        infoList.appendChild(newInfoItem("Latitude: ", position.satlatitude));
        infoList.appendChild(newInfoItem("Longitude: ", position.satlongitude));
        infoList.appendChild(newInfoItem("Altitude: ", position.sataltitude));
        infoList.appendChild(newInfoItem("Azimuth: ", position.azimuth));
        infoList.appendChild(newInfoItem("Elevation: ", position.elevation));
        infoList.appendChild(newInfoItem("Right Ascension: ", position.ra));
        infoList.appendChild(newInfoItem("Declination: ", position.dec));
        infoList.appendChild(newInfoItem("Timestamp: ", position.timestamp));
        
        document.body.appendChild(satInfo);


        // satellite future footprint
        positions.forEach((position, i) => {
          let secondarySat = this.newSatObject({
            satName: info.satname,
            satAltitude: position.sataltitude,
            satLatitude: position.satlatitude,
            satLongitude: position.satlongitude
          });
          this.earth.add(secondarySat);
        });
      })
      .catch(error => {
        console.log("Error:", error);
      });

    // run the animation
    this.animate();
  }

  resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  render() {
    // did aspect ratio / viewport change?
    if (this.resizeRendererToDisplaySize(this.renderer)) {
      // maintain camera render aspect ratio
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
    this.renderer.render(this.scene, this.camera);
  }

  animate(time) {
    requestAnimationFrame(this.animate);
    // controls.update();
    
    var delta = this.clock.getDelta();
    this.earth.rotation.y += 0.05 * delta;
    this.render();
  }
}
export default OrbitTracker;
