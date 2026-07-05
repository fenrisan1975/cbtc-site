// <favorite-button data-business-id="123" data-count="4"></favorite-button>
// A plain web component -- no framework needed. Tracks "have I favorited
// this?" per browser via localStorage, no login required.

const TOKEN_KEY = 'cbtc_client_token';
const FAVORITES_KEY = 'cbtc_favorited_ids';

function getClientToken() {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

function getFavoritedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveFavoritedIds(ids) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
}

class FavoriteButton extends HTMLElement {
  connectedCallback() {
    this.businessId = Number(this.dataset.businessId);
    this.count = Number(this.dataset.count) || 0;

    const favorited = getFavoritedIds().has(this.businessId);
    this.render(favorited);

    this.addEventListener('click', () => this.handleClick());
  }

  render(favorited) {
    this.innerHTML = `
      <button type="button" aria-pressed="${favorited}" style="
        background:${favorited ? 'var(--gold)' : 'transparent'};
        border:1.3px solid var(--gold);
        border-radius:999px;
        padding:4px 12px;
        font-size:13px;
        font-weight:700;
        cursor:pointer;
        white-space:nowrap;
      ">${favorited ? '♥' : '♡'} <span class="fav-count">${this.count}</span></button>
    `;
  }

  async handleClick() {
    const favoritedIds = getFavoritedIds();
    const alreadyFavorited = favoritedIds.has(this.businessId);
    const action = alreadyFavorited ? 'remove' : 'add';

    // optimistic update
    this.count += action === 'add' ? 1 : -1;
    if (action === 'add') favoritedIds.add(this.businessId);
    else favoritedIds.delete(this.businessId);
    saveFavoritedIds(favoritedIds);
    this.render(action === 'add');

    try {
      const res = await fetch('/api/toggle-favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: this.businessId,
          clientToken: getClientToken(),
          action,
        }),
      });
      const data = await res.json();
      if (typeof data.favoriteCount === 'number') {
        this.count = data.favoriteCount;
        this.render(action === 'add');
      }
    } catch {
      // leave the optimistic update in place if the network call fails --
      // not worth surfacing an error for a favorite button.
    }
  }
}

customElements.define('favorite-button', FavoriteButton);
