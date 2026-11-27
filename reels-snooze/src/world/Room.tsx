import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FONT_BODY, FONT_SIGN, FONT_TITLE } from "../fonts";
import { rng } from "../lib/anim";

// Room: x in [-2.6, 2.6], z in [-2.2, 2.6], floor y = 0.
export const ROOM = { x0: -2.6, x1: 2.6, z0: -2.2, z1: 2.6, h: 2.7 };
export const BED = { x0: -0.68, x1: 0.68, z0: -2.15, z1: 0.05, mattressTop: 0.55 };
export const WINDOW = { z0: -1.7, z1: -0.25, y0: 0.95, y1: 2.15 };
export const DOOR = { z0: 0.75, z1: 1.65, y1: 2.05 };
export const NIGHTSTAND = { x: 0.98, z: -1.86, top: 0.52 };

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
  }
  return tex;
}

const std = (color: string, roughness = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });

const Box: React.FC<{ p: [number, number, number]; s: [number, number, number]; m: THREE.Material; r?: [number, number, number]; shadow?: boolean }> = ({
  p,
  s,
  m,
  r = [0, 0, 0],
  shadow = true,
}) => (
  <mesh position={p} rotation={r} scale={s} material={m} castShadow={shadow} receiveShadow>
    <boxGeometry args={[1, 1, 1]} />
  </mesh>
);

export const Room: React.FC<{ fontsReady: boolean; clock: string; jacketOnHanger: boolean }> = ({ fontsReady, clock, jacketOnHanger }) => {
  const mats = useMemo(() => {
    const floorTex = canvasTexture(
      512,
      512,
      (g) => {
        const rand = rng(3);
        for (let i = 0; i < 8; i++) {
          const y = i * 64;
          const base = 150 + rand() * 30;
          g.fillStyle = `rgb(${base + 40},${base - 10},${base - 60})`;
          g.fillRect(0, y, 512, 64);
          g.fillStyle = "rgba(60,35,15,0.55)";
          g.fillRect(0, y, 512, 3);
          const cut = rand() * 400 + 50;
          g.fillRect(cut, y, 3, 64);
          for (let k = 0; k < 14; k++) {
            g.strokeStyle = `rgba(90,55,25,${0.08 + rand() * 0.1})`;
            g.beginPath();
            const yy = y + 6 + rand() * 52;
            g.moveTo(0, yy);
            g.bezierCurveTo(170, yy + rand() * 8 - 4, 340, yy + rand() * 8 - 4, 512, yy + rand() * 6 - 3);
            g.stroke();
          }
        }
      },
      [4, 4],
    );
    const wallTex = canvasTexture(
      256,
      256,
      (g) => {
        g.fillStyle = "#f2e7d8";
        g.fillRect(0, 0, 256, 256);
        g.fillStyle = "rgba(200,170,140,0.18)";
        for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 2, 256);
        g.fillStyle = "rgba(240,160,120,0.12)";
        for (let x = 16; x < 256; x += 32) for (let y = 8; y < 256; y += 32) g.fillRect(x - 2, y - 2, 4, 4);
      },
      [6, 3],
    );
    return {
      floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.65 }),
      wall: new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }),
      trim: std("#fbfaf5", 0.6),
      wood: std("#9b6a43", 0.6),
      woodDark: std("#6e4527", 0.65),
      sheet: std("#f6f3ec", 0.95),
      mattress: std("#e9e4da", 0.95),
      rug: std("#e7b24a", 1),
      rugEdge: std("#c7832e", 1),
      curtain: std("#9cc7e4", 0.95, { side: THREE.DoubleSide }),
      glass: new THREE.MeshStandardMaterial({ color: "#cfe8ff", roughness: 0.05, transparent: true, opacity: 0.18 }),
      lampShade: std("#fff1cf", 0.7, { emissive: "#ffcf7a", emissiveIntensity: 0.25 }),
      pot: std("#c8643b", 0.8),
      leaf: std("#3f8f4f", 0.8, { flatShading: true }),
      jacket: std("#263250", 0.55),
      door: std("#c9925e", 0.6),
    };
  }, []);

  const textTex = useMemo(() => {
    if (!fontsReady) return null;
    const calendar = canvasTexture(400, 520, (g) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 400, 520);
      g.fillStyle = "#e54b4b";
      g.fillRect(0, 0, 400, 110);
      g.fillStyle = "#fff";
      g.font = `64px "${FONT_SIGN}"`;
      g.textAlign = "center";
      g.fillText("11월", 200, 82);
      g.fillStyle = "#2a5bd7";
      g.font = `250px "${FONT_TITLE}"`;
      g.fillText("28", 200, 360);
      g.font = `90px "${FONT_SIGN}"`;
      g.fillText("토요일", 200, 470);
    });
    const poster = canvasTexture(420, 600, (g) => {
      g.fillStyle = "#2d3a56";
      g.fillRect(0, 0, 420, 600);
      g.fillStyle = "#ffd166";
      g.beginPath();
      g.arc(210, 210, 110, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#2d3a56";
      g.beginPath();
      g.arc(250, 180, 100, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff";
      g.textAlign = "center";
      g.font = `52px "${FONT_BODY}"`;
      g.fillText("일찍 일어나는 새는", 210, 420);
      g.fillStyle = "#ffd166";
      g.font = `70px "${FONT_TITLE}"`;
      g.fillText("피곤하다", 210, 510);
    });
    return { calendar, poster };
  }, [fontsReady]);

  const clockTex = useMemo(() => {
    const [hh, mm] = clock.split(":").map(Number);
    return canvasTexture(256, 256, (g) => {
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(128, 128, 124, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#2b2b2b";
      g.lineWidth = 10;
      g.stroke();
      g.fillStyle = "#2b2b2b";
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.fillRect(128 + Math.sin(a) * 98 - 4, 128 - Math.cos(a) * 98 - 4, 8, 8);
      }
      const hand = (angle: number, len: number, w: number, color: string) => {
        g.strokeStyle = color;
        g.lineWidth = w;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(128, 128);
        g.lineTo(128 + Math.sin(angle) * len, 128 - Math.cos(angle) * len);
        g.stroke();
      };
      hand(((hh % 12) + mm / 60) * (Math.PI / 6), 60, 12, "#2b2b2b");
      hand(mm * (Math.PI / 30), 92, 7, "#2b2b2b");
      g.fillStyle = "#e54b4b";
      g.beginPath();
      g.arc(128, 128, 9, 0, Math.PI * 2);
      g.fill();
    });
  }, [clock]);

  const outsideTex = useMemo(
    () =>
      canvasTexture(256, 256, (g) => {
        const grd = g.createLinearGradient(0, 0, 0, 256);
        grd.addColorStop(0, "#8fc8f5");
        grd.addColorStop(1, "#fff3d6");
        g.fillStyle = grd;
        g.fillRect(0, 0, 256, 256);
        g.fillStyle = "#b9c9d6";
        const rand = rng(11);
        let x = 0;
        while (x < 256) {
          const w = 20 + rand() * 30;
          const h = 40 + rand() * 90;
          g.fillRect(x, 256 - h, w - 3, h);
          g.fillStyle = rand() > 0.5 ? "#b9c9d6" : "#a9bccb";
          x += w;
        }
      }),
    [],
  );

  const curtainGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.55, 1.5, 24, 6);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 40) * 0.035);
    g.computeVertexNormals();
    return g;
  }, []);

  const pillowlessHeadboard = useMemo(() => new RoundedBoxGeometry(1.42, 0.75, 0.09, 4, 0.04), []);
  const W = WINDOW;
  const wallT = 0.12;
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.2]} material={mats.floor} receiveShadow>
        <planeGeometry args={[5.2, 4.8]} />
      </mesh>
      {/* back wall */}
      <Box p={[0, ROOM.h / 2, ROOM.z0 - wallT / 2]} s={[5.2 + wallT * 2, ROOM.h, wallT]} m={mats.wall} />
      {/* left wall with window opening */}
      <group position={[ROOM.x0 - wallT / 2, 0, 0]}>
        <Box p={[0, ROOM.h / 2, (ROOM.z0 + W.z0) / 2]} s={[wallT, ROOM.h, W.z0 - ROOM.z0]} m={mats.wall} />
        <Box p={[0, ROOM.h / 2, (W.z1 + ROOM.z1) / 2]} s={[wallT, ROOM.h, ROOM.z1 - W.z1]} m={mats.wall} />
        <Box p={[0, W.y0 / 2, (W.z0 + W.z1) / 2]} s={[wallT, W.y0, W.z1 - W.z0]} m={mats.wall} />
        <Box p={[0, (W.y1 + ROOM.h) / 2, (W.z0 + W.z1) / 2]} s={[wallT, ROOM.h - W.y1, W.z1 - W.z0]} m={mats.wall} />
        {/* frame & sill */}
        <Box p={[0.06, W.y0 - 0.03, (W.z0 + W.z1) / 2]} s={[0.22, 0.06, W.z1 - W.z0 + 0.12]} m={mats.trim} />
        <Box p={[0.02, (W.y0 + W.y1) / 2, (W.z0 + W.z1) / 2]} s={[0.05, W.y1 - W.y0, 0.05]} m={mats.trim} />
        <Box p={[0.02, (W.y0 + W.y1) / 2 + 0.1, (W.z0 + W.z1) / 2]} s={[0.05, 0.05, W.z1 - W.z0]} m={mats.trim} />
        <mesh position={[0, (W.y0 + W.y1) / 2, (W.z0 + W.z1) / 2]} rotation={[0, Math.PI / 2, 0]} material={mats.glass}>
          <planeGeometry args={[W.z1 - W.z0, W.y1 - W.y0]} />
        </mesh>
        <mesh position={[-1.2, (W.y0 + W.y1) / 2, (W.z0 + W.z1) / 2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[4, 3]} />
          <meshBasicMaterial map={outsideTex} toneMapped={false} />
        </mesh>
      </group>
      {/* curtains */}
      {[W.z0 - 0.18, W.z1 + 0.18].map((z, i) => (
        <mesh key={i} geometry={curtainGeo} material={mats.curtain} position={[ROOM.x0 + 0.1, 1.55, z]} rotation={[0, Math.PI / 2, 0]} castShadow />
      ))}
      <Box p={[ROOM.x0 + 0.12, 2.32, (W.z0 + W.z1) / 2]} s={[0.04, 0.04, W.z1 - W.z0 + 0.9]} m={mats.woodDark} />
      {/* right wall with door */}
      <group position={[ROOM.x1 + wallT / 2, 0, 0]}>
        <Box p={[0, ROOM.h / 2, (ROOM.z0 + DOOR.z0) / 2]} s={[wallT, ROOM.h, DOOR.z0 - ROOM.z0]} m={mats.wall} />
        <Box p={[0, ROOM.h / 2, (DOOR.z1 + ROOM.z1) / 2]} s={[wallT, ROOM.h, ROOM.z1 - DOOR.z1]} m={mats.wall} />
        <Box p={[0, (DOOR.y1 + ROOM.h) / 2, (DOOR.z0 + DOOR.z1) / 2]} s={[wallT, ROOM.h - DOOR.y1, DOOR.z1 - DOOR.z0]} m={mats.wall} />
        <Box p={[-0.02, DOOR.y1 / 2, (DOOR.z0 + DOOR.z1) / 2]} s={[0.05, DOOR.y1, DOOR.z1 - DOOR.z0]} m={mats.door} />
        <mesh position={[-0.07, 1.0, DOOR.z0 + 0.12]} material={mats.trim} castShadow>
          <sphereGeometry args={[0.035, 12, 10]} />
        </mesh>
        <Box p={[-0.03, DOOR.y1 + 0.03, (DOOR.z0 + DOOR.z1) / 2]} s={[0.08, 0.06, DOOR.z1 - DOOR.z0 + 0.12]} m={mats.trim} />
      </group>
      {/* baseboards */}
      <Box p={[0, 0.05, ROOM.z0 + 0.01]} s={[5.2, 0.1, 0.02]} m={mats.trim} shadow={false} />
      <Box p={[ROOM.x0 + 0.01, 0.05, 0.2]} s={[0.02, 0.1, 4.8]} m={mats.trim} shadow={false} />
      {/* rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.15, 0.006, 0.9]} material={mats.rugEdge} receiveShadow>
        <circleGeometry args={[1.05, 40]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.15, 0.008, 0.9]} material={mats.rug} receiveShadow>
        <circleGeometry args={[0.92, 40]} />
      </mesh>
      {/* bed */}
      <Box p={[0, 0.2, (BED.z0 + BED.z1) / 2]} s={[BED.x1 - BED.x0, 0.22, BED.z1 - BED.z0]} m={mats.wood} />
      {[
        [BED.x0 + 0.05, BED.z1 - 0.05],
        [BED.x1 - 0.05, BED.z1 - 0.05],
      ].map(([x, z], i) => (
        <Box key={i} p={[x, 0.1, z]} s={[0.08, 0.2, 0.08]} m={mats.woodDark} />
      ))}
      <mesh geometry={pillowlessHeadboard} material={mats.wood} position={[0, 0.78, BED.z0 - 0.02]} castShadow receiveShadow />
      <Box p={[0, 0.48, BED.z1 + 0.01]} s={[BED.x1 - BED.x0, 0.28, 0.07]} m={mats.wood} />
      <mesh position={[0, 0.43, (BED.z0 + BED.z1) / 2 - 0.02]} material={mats.mattress} castShadow receiveShadow>
        <primitive object={new RoundedBoxGeometry(1.26, 0.24, 2.06, 3, 0.05)} attach="geometry" />
      </mesh>
      <Box p={[0, BED.mattressTop - 0.004, (BED.z0 + BED.z1) / 2 - 0.02]} s={[1.24, 0.01, 2.04]} m={mats.sheet} shadow={false} />
      {/* nightstand + lamp */}
      <Box p={[NIGHTSTAND.x, NIGHTSTAND.top / 2, NIGHTSTAND.z]} s={[0.44, NIGHTSTAND.top, 0.4]} m={mats.wood} />
      <Box p={[NIGHTSTAND.x, NIGHTSTAND.top - 0.17, NIGHTSTAND.z + 0.201]} s={[0.36, 0.12, 0.01]} m={mats.woodDark} shadow={false} />
      <mesh position={[NIGHTSTAND.x + 0.08, NIGHTSTAND.top + 0.12, NIGHTSTAND.z - 0.06]} material={mats.woodDark} castShadow>
        <cylinderGeometry args={[0.015, 0.05, 0.24, 12]} />
      </mesh>
      <mesh position={[NIGHTSTAND.x + 0.08, NIGHTSTAND.top + 0.3, NIGHTSTAND.z - 0.06]} material={mats.lampShade} castShadow>
        <cylinderGeometry args={[0.07, 0.12, 0.16, 20, 1, true]} />
      </mesh>
      {/* wall clock */}
      <group position={[-1.45, 1.95, ROOM.z0 + 0.02]}>
        <mesh>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 32]} />
          <meshStandardMaterial color="#2b2b2b" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.021]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.2, 32]} />
          <meshStandardMaterial map={clockTex} roughness={0.6} />
        </mesh>
      </group>
      {/* calendar & poster (need fonts) */}
      {textTex && (
        <>
          <mesh position={[1.45, 1.55, ROOM.z0 + 0.015]} castShadow>
            <planeGeometry args={[0.4, 0.52]} />
            <meshStandardMaterial map={textTex.calendar} roughness={0.8} />
          </mesh>
          <mesh position={[ROOM.x0 + 0.015, 1.5, 0.9]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.6, 0.86]} />
            <meshStandardMaterial map={textTex.poster} roughness={0.8} />
          </mesh>
        </>
      )}
      {/* plant */}
      <group position={[-2.15, 0, -1.85]}>
        <mesh position={[0, 0.18, 0]} material={mats.pot} castShadow>
          <cylinderGeometry args={[0.16, 0.12, 0.36, 18]} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[Math.cos(i) * 0.08, 0.55 + (i % 3) * 0.12, Math.sin(i) * 0.08]} rotation={[Math.cos(i * 2) * 0.5, i, Math.sin(i) * 0.5]} scale={[0.12, 0.26, 0.05]} material={mats.leaf} castShadow>
            <sphereGeometry args={[1, 6, 4]} />
          </mesh>
        ))}
      </group>
      {/* coat stand with the suit jacket */}
      <group position={[2.2, 0, 0.25]}>
        <mesh position={[0, 0.85, 0]} material={mats.woodDark} castShadow>
          <cylinderGeometry args={[0.025, 0.03, 1.7, 10]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} material={mats.woodDark} castShadow>
          <cylinderGeometry args={[0.22, 0.24, 0.04, 16]} />
        </mesh>
        {jacketOnHanger && (
          <group position={[0, 1.38, 0.08]}>
            <mesh material={mats.jacket} scale={[0.26, 0.36, 0.1]} castShadow>
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
            <mesh position={[0, 0.02, 0.09]} scale={[0.05, 0.3, 0.02]} material={mats.trim}>
              <boxGeometry args={[1, 1, 1]} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
};
