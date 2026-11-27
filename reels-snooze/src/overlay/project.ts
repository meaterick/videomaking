import * as THREE from "three";
import { Cam } from "../camera/shots";
import { V3 } from "../lib/anim";

const camera = new THREE.PerspectiveCamera();
const v = new THREE.Vector3();

/** Project a world point to screen pixels using the shot camera. */
export function project(p: V3, cam: Cam, width: number, height: number) {
  camera.position.set(...cam.pos);
  camera.up.set(...cam.up).normalize();
  camera.lookAt(...cam.target);
  camera.fov = cam.fov;
  camera.aspect = width / height;
  camera.near = 0.01;
  camera.far = 100;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  v.set(...p).project(camera);
  return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, inFront: v.z > -1 && v.z < 1 };
}
