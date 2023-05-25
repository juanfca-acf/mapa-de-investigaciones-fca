const addresses = {
    "type": "FeatureCollection",
    "features": []
  }
 
  async function fetchGoogleSheetData() {
    const spreadsheetId = "ssID";
    const range = "Sheet1!DATA RANGE"; // range of data to retrieve
    const apiKey = "apiKey";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
 
    const response = await fetch(url);
 
    if (!response.ok) {
      throw new Error(`Failed to fetch data from Google Sheets. Error code: ${response.status}`);
    }
 
    const data = await response.json();
    const rows = data.values;
 
    if (!rows) {
      throw new Error(`No data found in range ${range}.`);
    }
 
    rows.forEach(row => {
      const [name, zip, lat, lng, Código, Tesista, CI, Sexo, Titulo, Sede, Coordinación, ÁreaTécnica, LíneadeInvest, Departamento, Municipio, Investigador1, Investigador2, Investigador3, Fecha] = row;
      addresses.features.push({
        "type": "Feature",
        "properties": {
          "name": name,
          "zip": zip,
          "Código": Código,
          "Tesista": Tesista,
          "CI": CI,
          "Sexo": Sexo,
          "Titulo": Titulo,
          "Sede": Sede,
          "Coordinación": Coordinación,
          "ÁreaTécnica": ÁreaTécnica,
          "LíneadeInvest.": LíneadeInvest,
          "Departamento": Departamento,
          "Municipio": Municipio,
          "Investigador1": Investigador1,
          "Investigador2": Investigador2,
          "Investigador3": Investigador3,
          "Fecha": Fecha,
        },
        "geometry": {
          "type": "Point",
          "coordinates": [lng, lat]
        }
      });
    });
  }
 
  fetchGoogleSheetData()
    .then(() => {
       
        const searchControl = new ShowAllControl();
        const map = new SearchMap(addresses, searchControl);
        new SearchForm(map);    // create the map and other components here
    })
   
    .catch(error => console.error(error));
     
  class ShowAllControl extends L.Control {
    onAdd(map) {
      this.map = map;
      this.container = document.createElement('div');
      this.container.className = 'map-show-all-control leaflet-bar leaflet-control';
      this.container.textContent = 'Show All';
      this.options.position = 'topleft';
      this.onClick = this.onClick.bind(this);
      this.initEvents();
 
      return this.container;
    }
    onRemove() {
      this.container.parentNode.removeChild(this.container);
      this.container.removeEventListener('click', this.onClick);
      this.map = undefined;
    }
    onClick() {
      let zoom = 4;
      if (window.innerWidth <= 960) {
        zoom = 3;
      }
 
      this.map.flyTo(
        SearchMap.mapCenter,
        zoom,
        { animate: true, duration: 1 }
        );
    }
    initEvents() {
      this.container.addEventListener('click', this.onClick);
    }
  }
 
  class SearchForm {
    onResultsClick = this.onResultsClick.bind(this);
    onClearBtnClick = this.onClearBtnClick.bind(this);
    onFormChange = this.onFormChange.bind(this);
    onFormSubmit = this.onFormSubmit.bind(this);
 
    constructor(searchMap) {
      this.searchMap = searchMap;
      this.map = searchMap.map;
      /*primer cambio */
      this.clusterGroup = this.searchMap.clusterGroup;
 
      this.initElements();
      this.initEvents();
      this.render();
    }
    initElements() {
      this.mapResultsEl = document.querySelector('.map-search-results');
      this.mapClearBtnEl = document.querySelector('.map-clear-btn');
      this.mapSearchInputEl = document.querySelector('.map-search-input');
      this.mapResultsInfoEl = document.querySelector('.map-results-info');
      this.formEl = document.querySelector('.map-search-form');
    }
    initEvents() {
      this.mapResultsEl.addEventListener('click', this.onResultsClick);
      this.mapResultsEl.addEventListener('keyup', this.onResultsClick);
      this.mapClearBtnEl.addEventListener('click', this.onClearBtnClick);
      this.formEl.addEventListener('input', this.onFormChange);
      this.formEl.addEventListener('submit', this.onFormSubmit);
    }
    onFormSubmit(event) {
      const searchTerms = this.mapSearchInputEl.value;
      this.hideResultEl();
      if (searchTerms.length > 2) {
        this.search(searchTerms);
      }
    }
    onFormChange(event) {
      const searchTerms = this.mapSearchInputEl.value;
      if (searchTerms) {
        this.mapClearBtnEl.style.display = 'block';
      } else {
        this.mapClearBtnEl.style.display = 'none';
      }
    }
    onClearBtnClick(event) {
      event.preventDefault();
      this.mapClearBtnEl.style.display = 'none';
      this.hideResultEl();
      this.render();
      this.formEl.reset();
      this.searchMap.resetMap();
      this.mapSearchInputEl.focus();
    }
    onResultsClick(event) {
      const target = event.target;
      const { id } = target.dataset.length ? target.dataset : target.closest('li')?.dataset || {};
 
      if (!id) {
        return;
      }
 
      this.searchMap.showAddresses([id]);
    }
    render() {
      /*2do cambio*/
      this.renderList(this.searchMap.clusterGroup.getLayers());
      this.mapSearchInputEl.value = '';
    }
    renderList(list) {
      let html = '';
      list.forEach((layer, index) => {
        html +=
        `<li role="link" tabindex="0" data-id="${layer.options.id}" class="map-search-result">
          <address class="column">
            <span class="map-result-name inline-block">${layer.options.name}</span>
            <span class="map-result-zip inline-block">${layer.options.zip}</span>
          </address>
        </li>`;
      });
      this.mapResultsEl.innerHTML = html;
    }
    hideResultEl() {
      this.mapResultsInfoEl.style.opacity = 0;
    }
    showResultEl() {
      this.mapResultsInfoEl.style.opacity = 1;
    }
    async search(searchTerm) {
      const nameZipSearchResults = [];
      const normalizedSearchTerm = searchTerm.toLowerCase();
 
      this.clusterGroup.eachLayer(layer => {
        const hasNameTerm = layer.options.name.toLowerCase().indexOf(normalizedSearchTerm) > -1;
        const hasZipTerm = layer.options.zip == normalizedSearchTerm;
       
        if (hasZipTerm || hasNameTerm) {
          nameZipSearchResults.push(layer);
        }
      });
 
      const addressRangeResults = await this.searchMap.getAddressesWithinRange(normalizedSearchTerm);
      const layers = Array.from(new Set([...nameZipSearchResults, ...addressRangeResults]));
 
      this.renderList(layers);
 
      if (layers.length === 0) {
        this.showResultEl();
      } else {
        this.searchMap.fitBounds(layers);
      }
    }
  }
 
  class SearchMap {
    static mapCenter = [-22.11287532271001,-56.25207694771304];
    ACCESS_TOKEN = 'your ACCESS TOKEN';
    zoom = {
      mobile: 6.5,
      desktop: 6.4,
      cluster: 10,
    };
    constructor(geoJSON, searchControl) {
      this.searchControl = searchControl;
      this.render(geoJSON);
    }
    render(geoJSON) {
      L.mapbox.accessToken = this.ACCESS_TOKEN;
 
      this.map = L.mapbox.map('map')
      .setView(SearchMap.mapCenter, this.zoom.desktop)
      .addLayer(L.mapbox.styleLayer('mapbox://styles/mapbox/outdoors-v12'))
      this.map._container.style.height = '100%';
      this.map._container.style.width = '100%';
 
      if (window.innerWidth <= 768) {
        this.map.setZoom(this.zoom.mobile);
      }
 
      this.clusterGroup = new L.MarkerClusterGroup({
        maxClusterRadius: 25,
        disableClusteringAtZoom: this.zoom.cluster
      });
 
      geoJSON.features.forEach((feature, index) => {
        const title = feature.properties.name + ' <br> ' + feature.properties.zip;
        const title2 = feature.properties.name + ' <br> ' + feature.properties.ÁreaTécnica+ ' <br> ' + feature.properties.Investigador1 + ' <br> ' + feature.properties.Investigador2 + ' <br> ' + feature.properties.Investigador3;
        const coords = feature.geometry.coordinates;
        const marker = L.marker(new L.LatLng(coords[1], coords[0]), {
          icon: L.mapbox.marker.icon({
            'marker-symbol': 'college',
            'marker-color': '#197d25'
          }),
          name: feature.properties.name,
          zip: feature.properties.zip,
          id: index
        });
        /*AQUI SE AGREGA POPUP!!*/
        marker.bindTooltip(title);
        marker.bindPopup(title2);      
        this.clusterGroup.addLayer(marker);
      });
 
      this.map.addLayer(this.clusterGroup);
      this.map.addControl(this.searchControl);
    }
    closeAllToolTips() {
      this.clusterGroup.eachLayer(layer => {
        layer.closeTooltip();
      });
    }
    showToolTips(layers) {
      console.log('show');
      layers.forEach(layer => layer.openTooltip());
    }
    showAddresses(ids=[]) {
      this.clusterGroup.eachLayer(layer => {
        if (ids.includes(String(layer.options.id))) {
          const { lat, lng } = layer.getLatLng();
          this.map.once('zoomend', () => layer.openTooltip());
          this.map.flyTo([lat,lng], this.zoom.cluster, 2);
        } else {
          layer.closeTooltip();
        }
      });
    }
    fitBounds(layers) {
      const coordinates = layers.map(layer => layer.getLatLng());
      this.closeAllToolTips();
      this.map.once('moveend', () => this.showToolTips(layers));
      this.map.fitBounds(coordinates, { minZoom: 6, maxZoom: 6 });  
    }
    resetMap() {
      this.closeAllToolTips();
      this.searchControl.onClick();
    }
    async getAddressesWithinRange(place, range=10) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${place}.json?
      country=us&types=place%2Cpostcode%2Caddress&access_token=${this.ACCESS_TOKEN}`;
      const results = [];    
      let zipCodeCoords = [];
 
      try {
        const response = await fetch(url);
        const json = await response.json();
 
        if (json.type) {
          zipCodeCoords = json?.features[0]?.center;
        }
      } catch(error) {
        console.log(error);
      }
 
      if (zipCodeCoords?.length) {
        const latLng = new L.LatLng(zipCodeCoords[1], zipCodeCoords[0]);
        const meters = range * 1609.34;
 
        this.clusterGroup.eachLayer(layer => {
          const distance = latLng.distanceTo(layer.getLatLng());
         
          if (distance < meters) {
            results.push(layer);
          };
        });
      }
 
      return results;
    }
  };
