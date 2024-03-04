const MAX_POKEMON = 1025;
const MIN_POKEMON = 1;
const MAX_POKEMON_BASE_STATS = 255;
const MAX_POKEMON_TOTAL_BASE_STATS = 720;
const STATS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed', 'total'];

const getPokemon = (query) => {
  /* Get pokemon data from freecodecamp's API */
  if (!query) return null;

  const formatName = (name) => {
    /* Format name for API */
  
    const pokemonIdRegex = /^[0-9]+$/;
    if (pokemonIdRegex.test(name)) return name.toString();
  
    return name.replace(/\s*\u2640/g, ' f').replace(/\s*\u2642/g, ' m') // gender
      .replace(/[^\w\s-]/gi, '') // special characters
      .replace(/\s+/g, '-') // whitespaces
      .toLowerCase(); 
  };

  const pokemonQuery = formatName(query);

  return fetch(`https://pokeapi-proxy.freecodecamp.rocks/api/pokemon/${pokemonQuery}`)
  .then(data => data.json())
  .catch(err => {
    console.log('Pokemon Not Found.');
    return null;
  });
}

const calculate_total = baseStatValues => {
  /* Calculate total base stats given base stats object */

  return Object.values(baseStatValues).reduce((a, b) => a + b, 0);
};

const getPokemonBaseStats = pokemonStats => {
  /* Returns object of pokemon base stats with total */
  const pokemonBaseStats = {};

  for (let i = 0; i < 6; i++) {
    pokemonBaseStats[pokemonStats[i].stat.name] = pokemonStats[i].base_stat
  }

  pokemonBaseStats.total = calculate_total(pokemonBaseStats);
  return pokemonBaseStats;
}

const calculateColor = baseStatValue => {
  /* Calculate color for base stat */
  let percentage = baseStatValue / MAX_POKEMON_BASE_STATS;

  // Interpolate between red and green
  let red = Math.floor(255 * (1 - percentage));
  let green = Math.floor(255 * percentage);
  let blue = 0;

  return [red, green, blue ];
};

const calculateTotalColor = totalBaseStats => {
  /* Calculate color for total base stats */
  
  // ensure total base stats is within valid range
  totalBaseStats = Math.max(0, Math.min(totalBaseStats, MAX_POKEMON_TOTAL_BASE_STATS));
  let percentage = totalBaseStats / MAX_POKEMON_TOTAL_BASE_STATS;

  // interpolate between red and green
  let red = Math.floor(255 * (1 - percentage));
  let green = Math.floor(255 * percentage);
  let blue = 0;

  return [red, green, blue ];
};

document.addEventListener('DOMContentLoaded', function(){
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const searchInputResult = document.getElementById('search-input-result');
  const searchButtonResult = document.getElementById('search-button-result');
  const nextButton = document.getElementById('next-button');
  const prevButton = document.getElementById('prev-button');
  const nextPokemonId = document.getElementById('next-pokemon-id');
  const prevPokemonId = document.getElementById('prev-pokemon-id');

  const pokemonId = document.getElementById('pokemon-id');
  const pokemonName = document.getElementById('pokemon-name');
  const pokemonSprite = document.getElementById('sprite');
  const pokemonWeight = document.getElementById('weight');
  const pokemonHeight = document.getElementById('height');
  const pokemonTypes = document.getElementById('types');

  const indexPage = document.getElementById('index-page');
  const resultPage = document.getElementById('result-page');
  const resultHeaderLogo = document.getElementById('result-header-logo');
  const showcaseContainer = document.querySelector('.showcase-container');
  const bars = {};

  const showcasePokemons = (n=3) => {
    /* Showcase n pokemons & load index page */

    const titleCase = txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    let loadedImages = 0;

    showcaseContainer.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const randId = Math.floor(Math.random() * (MAX_POKEMON - MIN_POKEMON + 1)) + MIN_POKEMON;
      fetch(`https://pokeapi-proxy.freecodecamp.rocks/api/pokemon/${randId}`)
      .then(data => data.json())
      .then(data => {
        const showcasePokemon = {
          name: titleCase(data.name),
          id: data.id,
          sprite: data.sprites['front_default'],
          types: data.types.map(t => t.type.name)
        }
        
        // preload images
        const image = new Image();
        image.src = showcasePokemon.sprite;
        image.onload = () => {
          loadedImages++;
          if (loadedImages >= n) {
            /* index page can now load */

            document.querySelector('.loader').style.display = 'none';
            indexPage.style.display = 'block';

            const showcaseItems = document.querySelectorAll('.showcase-item');
            showcaseItems.forEach(showcaseItem => {
              showcaseItem.addEventListener('click', function(){
                handlePokemonSearch(this.dataset.pokemon);
              });
            });
          }
        }

        showcaseContainer.innerHTML += `
          <div class="showcase-item ${showcasePokemon.types[0]}" data-pokemon="${showcasePokemon.id}">
              <div class="pokemon-details">
                  <h4>${showcasePokemon.name} <span class="sub">#${showcasePokemon.id}</span></h4>
                  <div class="pokemon-types">
                    ${
                      showcasePokemon.types.reduce((a, b) => {
                        a += `<div class="pokemon-type">${b}</div>`;
                        return a;
                      }, "")
                    }
                  </div>
              </div>
              <div class="pokemon-sprite">
                  <div class="pokemon-sprite-container">
                    <img src="${showcasePokemon.sprite}" alt="${showcasePokemon.name}" />
                  </div>
              </div>
          </div>
        `;
      }).catch(err => {
        console.log('Failed to fetch pokemon with id ' + randId);
      }); 
    }
  };

  const resetPokemon = () => {
    /* Reset pokemon fields and other data */

    searchInput.value = '';
    searchInputResult.value = '';

    pokemonTypes.innerHTML = '';

    pokemonId.textContent = '';  
    pokemonName.textContent = '';

    pokemonSprite.setAttribute('src', '');
    pokemonSprite.setAttribute('alt', '');

    pokemonWeight.textContent = '';
    pokemonHeight.textContent = '';

    prevButton.style.display = 'none';
    prevButton.dataset.id = '0';
    prevPokemonId.textContent= ``;
    nextButton.style.display = 'none';
    nextButton.dataset.id = '0';
    nextPokemonId.textContent= ``;

    for (let i = 0; i < STATS.length; i++) {
      const baseStatElement = document.getElementById(STATS[i]);
      baseStatElement.textContent = '';

      try {
        bars[STATS[i]].destroy();
      } catch {
        // :P
      }
    }
  }

  const updatePokemonBaseStats = ({ id, name, sprite, weight, height, types, stats }) => {
    /* Update DOM given base stats & other details object */
    
    const titleCase = txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();

    // https://stackoverflow.com/a/5624139
    const componentToHex = c => {
      let hex = c.toString(16);
      return hex.length === 1 ? `0${hex}` : hex;
    }
    const rgbToHex = ([ r, g, b]) => `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`

    // update details
    pokemonId.textContent = `#${id}`;  
    pokemonName.textContent = titleCase(name);

    pokemonSprite.setAttribute('src', sprite);
    pokemonSprite.setAttribute('alt', titleCase(name));

    pokemonWeight.textContent = weight;
    pokemonHeight.textContent = height;

    
    types.forEach(type => {
      const pokemonType = document.createElement('span');
      pokemonType.setAttribute('class', `type ${type}`);
      pokemonType.textContent = titleCase(type); 
      pokemonTypes.appendChild(pokemonType);
    });

    // update previous and next button
    if (id > MIN_POKEMON) {
      prevButton.style.display = 'flex';
      prevButton.dataset.id = id-1;
      prevPokemonId.textContent= `#${id-1}`;
    }

    if (id < MAX_POKEMON) {
      nextButton.style.display = 'flex';
      nextButton.dataset.id = id+1;
      nextPokemonId.textContent= `#${id+1}`;
    }

    // update base stats
    for (let baseStat in stats) {
      const baseStatElement = document.getElementById(baseStat);
      const baseStatValue = stats[baseStat];
      const baseStatPercentage = (
        baseStat === 'total' 
        ? Math.max(0, Math.min(baseStatValue, MAX_POKEMON_TOTAL_BASE_STATS)) / MAX_POKEMON_TOTAL_BASE_STATS
        : baseStatValue / MAX_POKEMON_BASE_STATS
      );

      const baseStatColor = rgbToHex(
        baseStat === 'total' 
        ? calculateTotalColor(baseStatValue) 
        : calculateColor(baseStatValue)
      );

      baseStatElement.textContent = baseStatValue;
      
      bars[baseStat] = new ProgressBar.Line(`#${baseStat}-bar`, {
        strokeWidth: 1,
        trailColor: '#eee',
        color: baseStatColor,
        duration: 500,
        trailWidth: 1,
        svgStyle: {
          width: '100%',
          height: '100%',
        },
      });

      bars[baseStat].animate(baseStatPercentage);
    }
  };

  const switchPage = (page = 'index', ref='', pokemonSearch='') => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelector('.loader').style.display = 'block';

    if (page === 'index') {
      showcasePokemons(3);
      resetPokemon();
      return;
    } 

    getPokemon(pokemonSearch).then(data => {
      if (data === null) {
        document.querySelector('.loader').style.display = 'none';
        alert('Pokémon not found');
        if (ref === '') {
          indexPage.style.display = 'block';
          resetPokemon();
        } else {
          resultPage.style.display = 'block'
        }
        
        return;
      }

      // preload sprite image
      const image = new Image();
      image.src = data.sprites['front_default'];
      image.onload = () => {
        const pokemonBaseStats = getPokemonBaseStats(data.stats);
        let { id, weight, height, name, sprites, types } = data;

        resetPokemon()
        updatePokemonBaseStats({
          id, 
          name, 
          weight,
          height,
          sprite: sprites.front_default,
          types: types.map(type => type.type.name),
          stats: pokemonBaseStats
        });

        document.querySelector('.loader').style.display = 'none';
        resultPage.style.display = 'block';
      }
    })
  };

  const handlePokemonSearch = (queryInput, ref='') => {
    if (!queryInput) return;

    switchPage('result', ref, queryInput);
  }

  const handlePokemonNextOrPrev = (e, ) => {
    if (e.currentTarget.dataset.id <= 0) return;

    switchPage('result', 'search', e.currentTarget.dataset.id);
  }

  switchPage('index', '');

  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') handlePokemonSearch(searchInput.value, '');
  });

  searchInputResult.addEventListener('keypress', e => {
    if (e.key === 'Enter') handlePokemonSearch(searchInputResult.value, 'search');
  });

  searchButton.addEventListener('click', () => handlePokemonSearch(searchInput.value));
  searchButtonResult.addEventListener('click', () => handlePokemonSearch(searchInputResult.value, 'search'))
  nextButton.addEventListener('click', handlePokemonNextOrPrev);
  prevButton.addEventListener('click', handlePokemonNextOrPrev);
  resultHeaderLogo.addEventListener('click', () => {
    switchPage('index', 'search', pokemonId.textContent);
  })
});