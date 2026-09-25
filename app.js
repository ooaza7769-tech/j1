const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let allPosts = [];

function esc(str){
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}
function fmtTime(iso){
  return new Date(iso).toLocaleString("pl-PL", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"});
}
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 2200);
}

// usuwa (po stronie klienta) wpisy starsze niż 30 dni — dodatkowe
// zabezpieczenie obok zaplanowanego zadania pg_cron w Supabase
async function cleanupOld(){
  const cutoff = new Date(Date.now() - 30*24*60*60*1000).toISOString();
  await supa.from("posts").delete().lt("created_at", cutoff);
}

async function loadFeed(){
  const feed = document.getElementById("feed");
  const { data, error } = await supa
    .from("posts")
    .select("*")
    .order("created_at", { ascending:false })
    .limit(500);

  if (error){ feed.innerHTML = `<p class="empty-state">Nie udało się wczytać wpisów.</p>`; return; }
  allPosts = data || [];

  const main = allPosts.filter(p=>!p.parent_id);
  feed.innerHTML = "";
  if (main.length === 0){
    feed.innerHTML = `<p class="empty-state">Cicho tu jeszcze... bądź pierwszy/a.</p>`;
    return;
  }
  main.forEach(post=> feed.appendChild(renderCard(post)));
}

function replyCountFor(id){
  return allPosts.filter(p=>p.parent_id === id).length;
}

function renderCard(post){
  const card = document.createElement("article");
  card.className = "note";
  const count = replyCountFor(post.id);
  card.innerHTML = `
    <div class="meta">
      <span class="nick">${post.nick ? esc(post.nick) : "Anonimowy"}</span>
      <span>${fmtTime(post.created_at)}</span>
    </div>
    <div class="content">${esc(post.content)}</div>
    <div class="reply-count">${count > 0 ? count + " odp." : "odpowiedz"}</div>
  `;
  card.addEventListener("click", ()=> openModal(post.id));
  return card;
}

// --- modal "przybliżenia" kartki + odpowiadanie ---
function openModal(postId){
  const post = allPosts.find(p=>p.id === postId);
  if (!post) return;
  closeModal();

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.id = "modal-overlay";
  overlay.addEventListener("click", (e)=>{ if (e.target === overlay) closeModal(); });

  const modal = document.createElement("div");
  modal.className = "modal-card";
  modal.innerHTML = `
    <button type="button" class="modal-close" aria-label="Zamknij">✕</button>
    <div class="meta">
      <span class="nick">${post.nick ? esc(post.nick) : "Anonimowy"}</span>
      <span>${fmtTime(post.created_at)}</span>
    </div>
    <div class="content">${esc(post.content)}</div>
    <div class="reply-list" data-reply-list></div>
    <div data-form-host></div>
  `;
  modal.querySelector(".modal-close").addEventListener("click", closeModal);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.addEventListener("keydown", escHandler);

  renderReplies(postId, modal.querySelector("[data-reply-list]"));
  modal.querySelector("[data-form-host]").appendChild(
    buildForm({
      parentId: postId,
      small:true,
      onSuccess: async ()=>{
        await refreshPost(postId);
        renderReplies(postId, modal.querySelector("[data-reply-list]"));
      }
    })
  );
}

function renderReplies(postId, host){
  const replies = allPosts.filter(p=>p.parent_id === postId)
    .sort((a,b)=> new Date(a.created_at) - new Date(b.created_at));
  host.innerHTML = "";
  replies.forEach(r=>{
    const rd = document.createElement("div");
    rd.className = "reply";
    rd.innerHTML = `
      <div class="meta"><span class="nick">${r.nick ? esc(r.nick) : "Anonimowy"}</span><span>${fmtTime(r.created_at)}</span></div>
      <div class="content">${esc(r.content)}</div>`;
    host.appendChild(rd);
  });
}

async function refreshPost(postId){
  // dociąga świeże dane wpisu + jego odpowiedzi i po cichu odświeża siatkę w tle
  const { data } = await supa.from("posts").select("*").or(`id.eq.${postId},parent_id.eq.${postId}`);
  if (!data) return;
  allPosts = allPosts.filter(p=> p.id !== postId && p.parent_id !== postId).concat(data);
  loadFeed();
}

function escHandler(e){ if (e.key === "Escape") closeModal(); }
function closeModal(){
  const ov = document.getElementById("modal-overlay");
  if (ov) ov.remove();
  document.removeEventListener("keydown", escHandler);
}

// --- formularz (główny wpis lub odpowiedź w modalu) ---
function buildForm({ parentId=null, small=false, onSuccess=null } = {}){
  const form = document.createElement("form");
  form.className = "compose";
  const uid = Math.random().toString(36).slice(2);

  form.innerHTML = `
    <div class="anon-toggle">
      <input type="checkbox" id="anon-${uid}" checked>
      <label for="anon-${uid}">Publikuj jako anonimowy/a</label>
    </div>
    <div class="row nick-row" style="display:none;">
      <input type="text" maxlength="${MAX_NICK_LEN}" placeholder="ksywka (max ${MAX_NICK_LEN} znaków)" class="nick-field" data-nick>
    </div>
    <textarea maxlength="${MAX_CONTENT_LEN}" placeholder="${small ? 'twoja odpowiedź...' : 'co się dzieje w szkole?'}" data-content required></textarea>
    <div class="char-count" data-count>0 / ${MAX_CONTENT_LEN}</div>
    <div class="turnstile-wrap" data-turnstile></div>
    <button type="submit" class="btn" data-submit disabled>${small ? "Odpowiedz" : "Przypnij wpis"}</button>
  `;

  const anon = form.querySelector(`#anon-${uid}`);
  const nickRow = form.querySelector(".nick-row");
  anon.addEventListener("change", ()=> nickRow.style.display = anon.checked ? "none" : "flex");

  const ta = form.querySelector("[data-content]");
  const count = form.querySelector("[data-count]");
  ta.addEventListener("input", ()=>{
    count.textContent = `${ta.value.length} / ${MAX_CONTENT_LEN}`;
    count.classList.toggle("over", ta.value.length >= MAX_CONTENT_LEN);
  });

  const submitBtn = form.querySelector("[data-submit]");
  const tsHost = form.querySelector("[data-turnstile]");
  let token = null;

  if (window.turnstile){
    window.turnstile.render(tsHost, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (t)=>{ token = t; submitBtn.disabled = false; },
      "expired-callback": ()=>{ token = null; submitBtn.disabled = true; },
    });
  }

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    if (!token){ toast("Rozwiąż captchę."); return; }
    const content = ta.value.trim();
    if (!content) return;
    const nick = anon.checked ? null : (form.querySelector("[data-nick]").value.trim() || null);

    submitBtn.disabled = true;
    const { error } = await supa.from("posts").insert({ content, nick, parent_id: parentId });
    if (error){
      toast("Coś poszło nie tak. Spróbuj ponownie.");
      submitBtn.disabled = false;
      return;
    }
    toast(parentId ? "Odpowiedź dodana." : "Wpis przypięty.");
    form.reset();
    count.textContent = `0 / ${MAX_CONTENT_LEN}`;
    if (window.turnstile) window.turnstile.reset(tsHost);
    token = null;
    submitBtn.disabled = true;

    if (onSuccess) onSuccess();
    else loadFeed();
  });

  return form;
}

window.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("compose-host").appendChild(buildForm());
  await cleanupOld();
  loadFeed();
});
