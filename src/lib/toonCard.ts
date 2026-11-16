// A toon2 character as a card in the 3D world: the drawing is redrawn into a canvas texture every frame, the card turns
// to face the camera, an invisible stand-in turned to the sun casts its shadow, and a soft contact shadow sits under
// the feet (reference: flat, unlit 2D characters standing in a lit 3D world with real shadows).
import * as THREE from "three";
import { NOINK } from "../videos/bridge/ink";
import { drawChar, CharSpec, Pose } from "./toon2";

export const SU = 0.00216; // metres per design unit (1000 units = 2.16 m), same as the ayam cast
const contactTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, "rgba(30,18,30,0.55)"); gr.addColorStop(1, "rgba(30,18,30,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();

export class ToonCard {
  canvas = document.createElement("canvas"); g: CanvasRenderingContext2D; tex: THREE.CanvasTexture;
  /** night relight: shade 0..1 darkens the side away from the key light (cool blue), lift brightens the lit edge */
  shade = 0; shadeCol = "18,22,58"; liftCol = "190,210,255";
  mesh: THREE.Mesh; shadow: THREE.Mesh; contact: THREE.Mesh;
  constructor(parent: THREE.Object3D, private k = 2) {
    this.canvas.width = 600 * k; this.canvas.height = 1000 * k; this.g = this.canvas.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    const geo = new THREE.PlaneGeometry(600 * SU, 1000 * SU); geo.translate(0, 475 * SU, 0);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false }));
    this.mesh.layers.set(NOINK); this.mesh.renderOrder = 2;
    this.shadow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, colorWrite: false, depthWrite: false }));
    this.shadow.castShadow = true; this.shadow.layers.set(NOINK);
    this.contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }));
    this.contact.rotation.x = -Math.PI / 2; this.contact.layers.set(NOINK); this.contact.renderOrder = 1;
    parent.add(this.mesh, this.shadow, this.contact);
  }
  /** redraw and place: (x, z) on the ground, facing the camera; shadow stand-in faces the sun */
  update(S: CharSpec, P: Pose, x: number, z: number, cam: THREE.Camera, sunDir: THREE.Vector3, scale = 1, y = 0, extra?: (g: CanvasRenderingContext2D, P: Pose) => void, behind?: (g: CanvasRenderingContext2D, P: Pose) => void) {
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // thick ink on the side away from the sun as seen from this camera, pulled 35 % toward the bottom (gravity)
    const v = sunDir.clone().transformDirection((cam as THREE.PerspectiveCamera).matrixWorldInverse);
    const away = Math.atan2(v.y, -v.x), down = Math.PI / 2, ink = P.ink ?? Math.atan2(0.65 * Math.sin(away) + 0.35 * Math.sin(down), 0.65 * Math.cos(away) + 0.35 * Math.cos(down));
    g.setTransform(this.k, 0, 0, this.k, 0, 0); behind?.(g, P); drawChar(g, S, { ...P, ink }); extra?.(g, P);
    if (this.shade > 0) { // light from the key-light side, cool shade on the far side, applied only on the drawing
      const dx = Math.cos(away), dy = Math.sin(away); g.save(); g.globalCompositeOperation = "source-atop";
      const gr = g.createLinearGradient(300 - dx * 260, 500 - dy * 260, 300 + dx * 260, 500 + dy * 260);
      gr.addColorStop(0, `rgba(${this.liftCol},${0.12 * this.shade})`); gr.addColorStop(0.45, `rgba(${this.shadeCol},${0.12 * this.shade})`); gr.addColorStop(1, `rgba(${this.shadeCol},${0.5 * this.shade})`);
      g.fillStyle = gr; g.fillRect(0, 0, 600, 1000); g.restore(); }
    this.tex.needsUpdate = true;
    this.place(x, z, cam, sunDir, scale, y);
  }
  /** draw anything (props, the shadow figure) into the card and place it like a character */
  custom(draw: (g: CanvasRenderingContext2D) => void, x: number, z: number, cam: THREE.Camera, sunDir: THREE.Vector3, scale = 1, y = 0) {
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(this.k, 0, 0, this.k, 0, 0); draw(g); this.tex.needsUpdate = true; this.place(x, z, cam, sunDir, scale, y);
  }
  /** lying flat (in bed, seen from above): the card's up points to `headDir` (radians in the ground plane) */
  lie(x: number, y: number, z: number, headDir: number, scale = 1, tilt = 0.12) {
    this.mesh.position.set(x, y, z); this.mesh.rotation.set(-Math.PI / 2 + tilt, 0, headDir, "YXZ"); this.mesh.rotation.order = "YXZ"; this.mesh.rotation.set(-Math.PI / 2 + tilt, headDir, 0);
    this.mesh.scale.setScalar(scale); this.shadow.visible = false; this.contact.visible = false;
  }
  /** full billboard (faces the camera, also in pitch), rolled so the drawing's up follows `upWorld` on screen; the
   *  point at canvas row `anchorY` (design units) lands on (x, y, z). Used for heads on pillows. */
  billboard(x: number, y: number, z: number, cam: THREE.Camera, scale: number, upWorld: THREE.Vector3, anchorY: number) {
    const q = cam.quaternion.clone(), camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(q), camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const roll = Math.atan2(-upWorld.dot(camRight), upWorld.dot(camUp));
    this.mesh.rotation.order = "XYZ"; this.mesh.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
    this.mesh.scale.setScalar(scale);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.mesh.quaternion);
    this.mesh.position.set(x, y, z).addScaledVector(up, -(975 - anchorY) * SU * scale);
    this.shadow.visible = false; this.contact.visible = false;
  }
  setVisible(v: boolean) { this.mesh.visible = v; this.shadow.visible = v; this.contact.visible = v; }
  private place(x: number, z: number, cam: THREE.Camera, sunDir: THREE.Vector3, scale: number, y = 0) {
    this.mesh.visible = true; this.shadow.visible = true; this.contact.visible = y < 0.05;
    const yaw = Math.atan2(cam.position.x - x, cam.position.z - z);
    this.mesh.rotation.order = "XYZ"; this.mesh.position.set(x, y, z); this.mesh.rotation.set(0, yaw, 0); this.mesh.scale.setScalar(scale);
    this.shadow.position.set(x, y, z); this.shadow.rotation.set(0, Math.atan2(sunDir.x, sunDir.z), 0); this.shadow.scale.setScalar(scale);
    this.contact.position.set(x, 0.03, z); this.contact.scale.set(0.95 * scale, 0.5 * scale, 1);
  }
}
