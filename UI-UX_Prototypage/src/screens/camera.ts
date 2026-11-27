/**
 * Création de post / story : « Accès Appareil » → « Photo » → publication.
 * Capture WebRTC (getUserMedia) avec repli sur <input type="file" capture="environment">.
 */
import { mountScreen, openAuthGate, root, toast } from "../app.ts";
import { isAuthenticated } from "../auth.ts";
import { goBack, navigate } from "../router.ts";
import { getCurrentUser, getPosts, setPosts } from "../store.ts";
import type { CommunityPost } from "../types.ts";
import { escapeHtml } from "../utils/html.ts";
import { icon, iconSvg } from "../utils/icons.ts";

const MAX_SIDE = 1080;

export function renderCamera(): void {
  if (!isAuthenticated()) {
    navigate("/community", { replace: true });
    openAuthGate("/camera");
    return;
  }
  const supported = Boolean(navigator.mediaDevices?.getUserMedia);
  mountScreen(
    `<main class="onboarding onboarding--center">
      <input type="file" accept="image/*" capture="environment" class="visually-hidden" id="file-capture" tabindex="-1" aria-hidden="true">
      <div class="stack stack--32 stack--center">
        <p class="h2 center">Autoriser l’utilisation de l’appareil photo de votre appareil</p>
        <button type="button" class="button button--primary button--fixed" data-action="allow">Autoriser</button>
        <button type="button" class="button button--ghost button--label" data-action="gallery">${icon("gallery")} Choisir dans la galerie</button>
        <button type="button" class="button button--ghost button--label" data-action="cancel">Annuler</button>
      </div>
    </main>`,
    {
      allow: () => (supported ? void startCamera() : pickFile()),
      gallery: pickFile,
      cancel: () => goBack("/community"),
    },
  );
  bindFileInput();
}

function pickFile(): void {
  root.querySelector<HTMLInputElement>("#file-capture")?.click();
}

function bindFileInput(): void {
  const input = root.querySelector<HTMLInputElement>("#file-capture");
  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      renderComposer(await downscale(file));
    } catch {
      toast("Impossible de lire cette image");
    }
  });
}

async function startCamera(): Promise<void> {
  let facingMode: "environment" | "user" = "environment";
  let stream: MediaStream | null = null;
  let torch = false;
  let lastShot = "";

  const signal = mountScreen(
    `<main class="camera">
      <video class="camera__feed" autoplay playsinline muted aria-label="Aperçu caméra"></video>
      <span class="camera__flash" aria-hidden="true"></span>
      <input type="file" accept="image/*" capture="environment" class="visually-hidden" id="file-capture" tabindex="-1" aria-hidden="true">
      <div class="camera__bar">
        <button type="button" class="icon-button" data-action="close" aria-label="Fermer">${icon("cross")}</button>
        <button type="button" class="icon-button" data-action="torch" aria-label="Flash" aria-pressed="false">${icon("no-flash")}</button>
        <button type="button" class="icon-button" data-action="flip" aria-label="Changer de caméra">${icon("camera-switch")}</button>
      </div>
      <div class="camera__bar">
        <button type="button" class="thumb" data-action="gallery" aria-label="Galerie"></button>
        <button type="button" class="shutter" data-action="shoot" aria-label="Prendre la photo">${iconSvg("photo-button")}</button>
        <button type="button" class="icon-button" data-action="flip" aria-label="Changer de caméra">${icon("camera-switch")}</button>
      </div>
    </main>`,
    {
      close: () => goBack("/community"),
      gallery: pickFile,
      flip: () => {
        facingMode = facingMode === "environment" ? "user" : "environment";
        void open();
      },
      torch: async (target) => {
        const track = stream?.getVideoTracks()[0];
        torch = !torch;
        target.setAttribute("aria-pressed", String(torch));
        target.innerHTML = icon(torch ? "flash" : "no-flash");
        try {
          await track?.applyConstraints({ advanced: [{ torch } as MediaTrackConstraintSet] });
        } catch {
          /* Torche non prise en charge : le flash écran est utilisé à la capture. */
        }
      },
      shoot: () => {
        const video = root.querySelector<HTMLVideoElement>(".camera__feed");
        if (!video || video.videoWidth === 0) return;
        const flash = root.querySelector(".camera__flash");
        flash?.classList.remove("is-on");
        void (flash as HTMLElement | null)?.offsetWidth;
        flash?.classList.add("is-on");
        lastShot = captureFrame(video, facingMode === "user");
        const thumb = root.querySelector(".thumb");
        if (thumb) thumb.innerHTML = `<img src="${lastShot}" alt="" width="44" height="44">`;
        stop();
        renderComposer(lastShot);
      },
    },
  );
  bindFileInput();

  const stop = (): void => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };
  signal.addEventListener("abort", stop);

  const open = async (): Promise<void> => {
    stop();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (signal.aborted) return stop();
      const video = root.querySelector<HTMLVideoElement>(".camera__feed");
      if (!video) return;
      video.srcObject = stream;
      video.classList.toggle("is-front", facingMode === "user");
    } catch {
      toast("Caméra indisponible : choisis une photo");
      pickFile();
    }
  };
  await open();
}

function captureFrame(video: HTMLVideoElement, mirror: boolean): string {
  const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) return "";
  if (mirror) {
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Réduit l'image pour tenir dans le stockage local. */
async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

function renderComposer(image: string): void {
  let kind: "post" | "story" = "post";
  const signal = mountScreen(
    `<main class="screen screen--bare">
      <header class="topbar">
        <button type="button" class="icon-button icon-button--edge" data-action="retake" aria-label="Reprendre">${icon("back")}</button>
        <h1 class="topbar__title"><span>Nouvelle publication</span></h1>
        <span class="icon-button icon-button--edge" aria-hidden="true"></span>
      </header>
      <div class="composer-preview"><img src="${escapeHtml(image)}" alt="Aperçu de la photo" width="350" height="438"></div>
      <form class="stack stack--16" id="composer">
        <div class="segmented" role="radiogroup" aria-label="Type de publication">
          <button type="button" class="chip is-active" role="radio" aria-checked="true" data-action="kind" data-kind="post">Post</button>
          <button type="button" class="chip" role="radio" aria-checked="false" data-action="kind" data-kind="story">Story</button>
        </div>
        <label class="visually-hidden" for="composer-event">Événement lié</label>
        <input id="composer-event" class="field field--outline" name="event" placeholder="Événement ou lieu" maxlength="80">
        <label class="visually-hidden" for="composer-text">Légende</label>
        <textarea id="composer-text" class="textarea" name="text" maxlength="280" placeholder="Raconte ta sortie…"></textarea>
        <button type="submit" class="button button--primary button--block">Publier</button>
      </form>
    </main>`,
    {
      retake: () => renderCamera(),
      kind: (target) => {
        kind = target.dataset.kind === "story" ? "story" : "post";
        root.querySelectorAll<HTMLElement>("[data-action='kind']").forEach((chip) => {
          const active = chip === target;
          chip.classList.toggle("is-active", active);
          chip.setAttribute("aria-checked", String(active));
        });
      },
    },
  );

  const form = root.querySelector<HTMLFormElement>("#composer");
  form?.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const user = getCurrentUser();
      const post: CommunityPost = {
        id: `post-${Date.now()}`,
        authorId: user?.id,
        author: user?.name ?? "Utilisateur",
        avatar: (user?.name ?? "U").charAt(0).toUpperCase(),
        text: String(data.get("text") ?? "").trim() || (kind === "story" ? "Nouvelle story" : "Nouvelle sortie"),
        image,
        eventTitle: String(data.get("event") ?? "").trim() || "Sortie à Paris",
        likes: 0,
        liked: false,
        saves: 0,
        shares: 0,
        comments: [],
        createdAt: new Date().toISOString(),
        challenge: false,
        kind,
      };
      if (!setPosts([post, ...getPosts()])) {
        toast("Stockage plein : supprime d’anciens posts");
        return;
      }
      toast(kind === "story" ? "Story publiée" : "Post publié");
      navigate("/community", { replace: true });
    },
    { signal },
  );
}
