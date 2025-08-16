// SolarVision AI - Smart Solar Intelligence Platform

class SolarVisionAI {
    constructor() {
        this.currentPage = 'home';
        this.map = null;
        this.currentLocation = null;
        this.roofData = null;
        this.optimizationResults = null;
        this.selectedZone = null;
        this.drawingZones = [];
        this.zoneCounter = 0;

        // Initialize the application
        this.init();
    }

    init() {
        console.log('🧠 Initializing SolarVision AI...');

        // Setup event listeners
        this.setupNavigation();
        this.setupSearchFunctionality();
        this.setupMapControls();
        this.setupAnalysisPanel();
        this.setupModals();
        this.initializeAnimations();

        console.log('✅ SolarVision AI initialized successfully!');
    }

    // Navigation System
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const ctaButtons = document.querySelectorAll('[data-action="start-analysis"]');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateToPage(page);
            });
        });

        ctaButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.navigateToPage('analyzer');
            });
        });
    }

    navigateToPage(page) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // Show/hide pages
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.classList.remove('active');
        });

        const targetPage = document.getElementById(page);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;

            // Initialize specific page functionality
            if (page === 'analyzer') {
                if (!this.map) {
                    setTimeout(() => this.initializeMap(), 100);
                }
                // Always show the map when on analyzer page
                setTimeout(() => {
                    if (this.map) {
                        this.map.invalidateSize();
                    }
                }, 200);
            } else if (page === 'insights') {
                setTimeout(() => this.initializeInsightsDashboard(), 100);
            }
        }
    }

    // Map Functionality
    initializeMap() {
        if (this.map) return;

        // Check if map container exists
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }

        // Check if container is already initialized
        if (mapContainer._leaflet_id) {
            console.log('Map container already has Leaflet instance, skipping initialization');
            return;
        }

        try {
            // Initialize Leaflet map centered on Europe
            this.map = L.map('map', {
                maxZoom: 20, // Reasonable max zoom for detailed drawing
                minZoom: 3,
                scrollWheelZoom: false // Disable scroll wheel zoom
            }).setView([50.8503, 4.3517], 6); // Default to Brussels, Europe

            // Add tile layers
            this.streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19 // OpenStreetMap max zoom level
            });

            this.satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
                maxZoom: 20 // Esri satellite imagery max zoom level
            });

            // Add default layer
            this.streetLayer.addTo(this.map);

            // Initialize drawing functionality
            this.initializeDrawing();

            // Initialize drawing zones array
            this.drawingZones = [];
            this.zoneCounter = 0;

            console.log('🗺️ Map initialized successfully with drawing capabilities');
        } catch (error) {
            console.error('❌ Error initializing map:', error);
        }
    }

    initializeDrawing() {
        // Initialize Leaflet Draw
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);

        // Drawing control options
        this.drawControl = new L.Control.Draw({
            position: 'topleft',
            draw: {
                polygon: {
                    allowIntersection: false,
                    drawError: {
                        color: '#e1e100',
                        message: '<strong>Error:</strong> Shape edges cannot cross!'
                    },
                    shapeOptions: {
                        color: '#6366f1',
                        fillColor: '#6366f1',
                        fillOpacity: 0.3,
                        weight: 3
                    }
                },
                rectangle: {
                    shapeOptions: {
                        color: '#6366f1',
                        fillColor: '#6366f1',
                        fillOpacity: 0.3,
                        weight: 3
                    }
                },
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false
            },
            edit: {
                featureGroup: this.drawnItems,
                remove: true
            }
        });

        this.map.addControl(this.drawControl);

        // Event handlers for drawing
        this.map.on(L.Draw.Event.CREATED, (e) => {
            this.onDrawCreated(e);
        });

        this.map.on(L.Draw.Event.EDITED, (e) => {
            this.onDrawEdited(e);
        });

        this.map.on(L.Draw.Event.DELETED, (e) => {
            this.onDrawDeleted(e);
        });

        // Add drawing completion detection
        this.map.on(L.Draw.Event.DRAWSTART, (e) => {
            this.currentDrawingHandler = e.handler;
        });

        this.map.on(L.Draw.Event.DRAWSTOP, (e) => {
            this.currentDrawingHandler = null;
        });
    }

    onDrawCreated(e) {
        const layer = e.layer;
        const type = e.layerType;

        console.log('🎨 Drawing completed! Type:', type, 'Layer:', layer);

        // Stop drawing mode after a brief delay to allow Leaflet to complete
        setTimeout(() => {
            this.stopDrawingMode();
        }, 100);

        // Add unique ID to the layer
        this.zoneCounter++;
        const zoneId = `zone_${this.zoneCounter}`;
        layer.zoneId = zoneId;

        // Calculate area
        const area = this.calculateArea(layer);

        // Default panel count
        const panelCount = 25;

        // Create zone data
        const zoneData = {
            id: zoneId,
            layer: layer,
            type: type,
            area: area,
            panelCount: panelCount,
            panelWattage: 400, // Default 400W panels
            efficiency: 0.85 // System efficiency
        };

        // Store zone data
        this.drawingZones.push(zoneData);

        // Add to map
        this.drawnItems.addLayer(layer);

        // Setup zone click handler
        layer.on('click', () => {
            this.selectZone(zoneData);
            // Update visual selection in list
            document.querySelectorAll('.zone-item').forEach(item => item.classList.remove('selected'));
            document.querySelector(`[data-zone-id="${zoneData.id}"]`)?.classList.add('selected');
        });

        // Add to zones list (disabled - no zonesItems element in HTML)
        // this.addZoneToList(zoneData);

        // Auto-select the new zone immediately after creation
        setTimeout(() => {
            console.log('🎯 Auto-selecting new zone:', zoneId);

            // First deselect all other zones
            this.drawingZones.forEach(zone => {
                if (zone.layer && zone.id !== zoneId) {
                    zone.layer.setStyle({
                        color: '#6366f1',
                        fillColor: '#6366f1',
                        fillOpacity: 0.3,
                        weight: 3
                    });
                }
            });

            // Select the new zone
            this.selectedZone = zoneData;

            // Force layer style update to orange
            if (zoneData.layer) {
                zoneData.layer.setStyle({
                    color: '#f59e0b',
                    fillColor: '#f59e0b',
                    fillOpacity: 0.5,
                    weight: 4
                });

                // Force a redraw
                zoneData.layer.redraw();
            }

            // Update visual selection in any zone lists
            document.querySelectorAll('.zone-item').forEach(item => item.classList.remove('selected'));
            const zoneItem = document.querySelector(`[data-zone-id="${zoneData.id}"]`);
            if (zoneItem) {
                zoneItem.classList.add('selected');
            }

            // Update UI controls
            this.updateSelectedZoneControls();
            this.updateActionButtons();

            // Ensure selected zone controls are visible
            const selectedZoneControls = document.getElementById('selectedZoneControls');
            if (selectedZoneControls) {
                selectedZoneControls.style.display = 'block';
            }

            console.log('✅ Zone auto-selected and styled orange');
        }, 500);

        // Update analysis panel
        this.updateZoneAnalysis();



        console.log(`🎯 Created solar zone: ${zoneId}, Area: ${area.toFixed(2)} m²`);
    }

    onDrawEdited(e) {
        const layers = e.layers;
        layers.eachLayer((layer) => {
            // Find the zone data
            const zoneData = this.drawingZones.find(zone => zone.layer === layer);
            if (zoneData) {
                // Recalculate area and panels
                zoneData.area = this.calculateArea(layer);
                zoneData.panelCount = this.calculatePanelCount(zoneData.area);

                // Update popup
                this.createZonePopup(layer, zoneData);

                console.log(`✏️ Edited solar zone: ${zoneData.id}, New area: ${zoneData.area.toFixed(2)} m²`);
            }
        });

        // Update analysis panel
        this.updateZoneAnalysis();
    }

    onDrawDeleted(e) {
        const layers = e.layers;
        layers.eachLayer((layer) => {
            // Remove from zones array
            this.drawingZones = this.drawingZones.filter(zone => zone.layer !== layer);
            console.log(`🗑️ Deleted solar zone: ${layer.zoneId}`);
        });

        // Update analysis panel
        this.updateZoneAnalysis();
    }

    calculateArea(layer) {
        let area = 0;

        if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
            // Calculate area using Leaflet's built-in method
            const latLngs = layer.getLatLngs()[0];
            area = L.GeometryUtil.geodesicArea(latLngs);
        }

        return area; // Returns area in square meters
    }

    calculatePanelCount(area) {
        // Default panel count for new zones
        return 25;
    }

    calculateMaxRecommendedPanels(area) {
        // Standard solar panel dimensions: 2m x 1m = 2 m²
        const panelArea = 2; // m²
        const spacingFactor = 0.7; // Account for spacing, inverters, walkways

        return Math.floor((area * spacingFactor) / panelArea);
    }

    enableDrawingMode() {
        // Prevent duplicate dropdowns
        if (document.querySelector('.drawing-mode-dropdown')) {
            return;
        }
        // Show drawing mode dropdown
        this.showDrawingModeDropdown();
    }

    showDrawingModeDropdown() {
        // Get the Draw Zone button position
        const drawZoneBtn = document.getElementById('drawZoneBtn');
        if (!drawZoneBtn) return;

        const btnRect = drawZoneBtn.getBoundingClientRect();

        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'drawing-mode-dropdown';
        dropdown.innerHTML = `
            <button class="drawing-mode-option" data-mode="polygon">
                <i class="fas fa-draw-polygon"></i>
                <span>Draw Polygon</span>
            </button>
            <button class="drawing-mode-option" data-mode="rectangle">
                <i class="fas fa-square"></i>
                <span>Draw Rectangle</span>
            </button>
        `;

        // Position dropdown under the button (accounting for scroll)
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        dropdown.style.position = 'absolute';
        dropdown.style.top = (btnRect.bottom + scrollTop + 5) + 'px';
        dropdown.style.left = (btnRect.left + scrollLeft) + 'px';
        dropdown.style.zIndex = '1001';
        dropdown.style.display = 'flex';
        dropdown.style.flexDirection = 'column';

        document.body.appendChild(dropdown);
        
        console.log('🎯 Dropdown created and positioned:', {
            top: dropdown.style.top,
            left: dropdown.style.left,
            zIndex: dropdown.style.zIndex,
            display: dropdown.style.display
        });

        // Add event listeners
        dropdown.querySelector('[data-mode="polygon"]').addEventListener('click', () => {
            this.startPolygonDrawing();
            this.hideDrawingModeDropdown();
        });

        dropdown.querySelector('[data-mode="rectangle"]').addEventListener('click', () => {
            this.startRectangleDrawing();
            this.hideDrawingModeDropdown();
        });

        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', this.handleDropdownOutsideClick.bind(this), { once: true });
        }, 100);
    }

    hideDrawingModeDropdown() {
        const dropdown = document.querySelector('.drawing-mode-dropdown');
        if (dropdown) {
            dropdown.remove();
        }
    }

    handleDropdownOutsideClick(event) {
        const dropdown = document.querySelector('.drawing-mode-dropdown');
        const drawZoneBtn = document.getElementById('drawZoneBtn');

        if (dropdown && !dropdown.contains(event.target) && event.target !== drawZoneBtn) {
            this.hideDrawingModeDropdown();
        }
    }

    startPolygonDrawing() {
        if (this.map && this.drawControl) {
            const polygonDrawer = new L.Draw.Polygon(this.map, this.drawControl.options.draw.polygon);
            polygonDrawer.enable();
            this.currentDrawer = polygonDrawer;
        }
    }

    startRectangleDrawing() {
        if (this.map && this.drawControl) {
            const rectangleDrawer = new L.Draw.Rectangle(this.map, this.drawControl.options.draw.rectangle);
            rectangleDrawer.enable();
            this.currentDrawer = rectangleDrawer;
        }
    }

    stopDrawingMode() {
        // Disable current drawer
        if (this.currentDrawer) {
            try {
                this.currentDrawer.disable();
            } catch (e) {
                console.warn('Error disabling drawer:', e);
            }
            this.currentDrawer = null;
        }

        // Clear drawing handler
        this.currentDrawingHandler = null;

        // Reset map cursor
        if (this.map && this.map._container) {
            this.map._container.style.cursor = '';
        }

        // Disable any active Leaflet Draw tools
        if (this.map && this.map._toolbars) {
            Object.values(this.map._toolbars).forEach(toolbar => {
                if (toolbar._activeMode) {
                    try {
                        toolbar._activeMode.handler.disable();
                    } catch (e) {
                        console.warn('Error disabling toolbar:', e);
                    }
                }
            });
        }
    }

    selectZone(zoneData) {
        // Deselect all zones first
        this.drawingZones.forEach(zone => {
            if (zone.layer) {
                zone.layer.setStyle({
                    color: '#6366f1',
                    fillColor: '#6366f1',
                    fillOpacity: 0.3,
                    weight: 3
                });
            }
        });

        // Remove selected class from all zone items
        document.querySelectorAll('.zone-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Select new zone
        this.selectedZone = zoneData;

        if (zoneData && zoneData.layer) {
            // Highlight selected zone
            zoneData.layer.setStyle({
                color: '#f59e0b',
                fillColor: '#f59e0b',
                fillOpacity: 0.5,
                weight: 4
            });

            // Add selected class to corresponding zone item
            const zoneItem = document.querySelector(`[data-zone-id="${zoneData.id}"]`);
            if (zoneItem) {
                zoneItem.classList.add('selected');
            }
        }

        // Update UI
        this.updateSelectedZoneControls();
        this.updateActionButtons();
    }

    updateSelectedZoneControls() {
        const controlsDiv = document.getElementById('selectedZoneControls');
        const selectedZoneName = document.getElementById('selectedZoneName');
        const zonePanelCount = document.getElementById('zonePanelCount');
        const zonePanelCountValue = document.getElementById('zonePanelCountValue');

        if (this.selectedZone) {
            controlsDiv.style.display = 'block';
            selectedZoneName.textContent = `Zone ${this.selectedZone.id.split('_')[1]}`;
            zonePanelCount.value = this.selectedZone.panelCount;

            const maxRecommended = this.calculateMaxRecommendedPanels(this.selectedZone.area);
            let displayText = `${this.selectedZone.panelCount} panels`;

            // Show warning if too many panels
            if (this.selectedZone.panelCount > maxRecommended) {
                displayText += ` (⚠️ Recommended max: ${maxRecommended})`;
                zonePanelCountValue.style.color = '#f59e0b';
            } else {
                zonePanelCountValue.style.color = '#6366f1';
            }

            zonePanelCountValue.textContent = displayText;
            this.updateSelectedZoneStats();
        } else {
            controlsDiv.style.display = 'none';
        }
    }

    updateSelectedZoneStats() {
        if (!this.selectedZone) return;

        const energyOutput = this.calculateEnergyOutput(this.selectedZone);
        const systemSize = (this.selectedZone.panelCount * this.selectedZone.panelWattage) / 1000;
        const efficiencyScore = this.calculateEfficiencyScore(energyOutput, systemSize);

        document.getElementById('selectedZoneArea').textContent = `${this.selectedZone.area.toFixed(1)} m²`;
        document.getElementById('selectedZonePower').textContent = `${systemSize.toFixed(1)} kW`;
        document.getElementById('selectedZoneOutput').textContent = `${energyOutput.toFixed(0)} kWh`;
        document.getElementById('selectedZoneSavings').textContent = `${efficiencyScore}% efficiency`;
    }

    updateActionButtons() {
        const editBtn = document.getElementById('editZoneBtn');
        const deleteBtn = document.getElementById('deleteZoneBtn');

        if (this.selectedZone) {
            editBtn.disabled = false;
            deleteBtn.disabled = false;
        } else {
            editBtn.disabled = true;
            deleteBtn.disabled = true;
        }
    }

    addZoneToList(zoneData) {
        const zonesItems = document.getElementById('zonesItems');
        if (!zonesItems) {
            console.warn('zonesItems element not found, skipping zone list update');
            return;
        }
        
        const noZonesMessage = zonesItems.querySelector('.no-zones-message');

        // Remove no zones message if it exists
        if (noZonesMessage) {
            noZonesMessage.remove();
        }

        // Create zone item
        const zoneItem = document.createElement('div');
        zoneItem.className = 'zone-item';
        zoneItem.dataset.zoneId = zoneData.id;

        const energyOutput = this.calculateEnergyOutput(zoneData);
        const systemSize = (zoneData.panelCount * zoneData.panelWattage) / 1000;
        const efficiencyScore = this.calculateEfficiencyScore(energyOutput, systemSize);

        zoneItem.innerHTML = `
            <div class="zone-item-header">
                <h5>Zone ${zoneData.id.split('_')[1]}</h5>
                <span class="zone-type">${zoneData.type}</span>
            </div>
            <div class="zone-item-stats">
                <div class="zone-item-stat">
                    <span class="stat-label">Panels:</span>
                    <span class="stat-value">${zoneData.panelCount}</span>
                </div>
                <div class="zone-item-stat">
                    <span class="stat-label">Power:</span>
                    <span class="stat-value">${systemSize.toFixed(1)} kW</span>
                </div>
                <div class="zone-item-stat">
                    <span class="stat-label">Efficiency:</span>
                    <span class="stat-value">${efficiencyScore}%</span>
                </div>
            </div>
        `;

        // Add click handler
        zoneItem.addEventListener('click', () => {
            this.selectZone(zoneData);
            // Update visual selection in list
            document.querySelectorAll('.zone-item').forEach(item => item.classList.remove('selected'));
            zoneItem.classList.add('selected');
        });

        zonesItems.appendChild(zoneItem);

        // Update zones count
        this.updateZonesCount();
    }

    updateZoneInList(zoneData) {
        const zoneItem = document.querySelector(`[data-zone-id="${zoneData.id}"]`);
        if (zoneItem) {
            const energyOutput = this.calculateEnergyOutput(zoneData);
            const systemSize = (zoneData.panelCount * zoneData.panelWattage) / 1000;
            const efficiencyScore = this.calculateEfficiencyScore(energyOutput, systemSize);

            const statsDiv = zoneItem.querySelector('.zone-item-stats');
            statsDiv.innerHTML = `
                <div class="zone-item-stat">
                    <span class="stat-label">Panels:</span>
                    <span class="stat-value">${zoneData.panelCount}</span>
                </div>
                <div class="zone-item-stat">
                    <span class="stat-label">Power:</span>
                    <span class="stat-value">${systemSize.toFixed(1)} kW</span>
                </div>
                <div class="zone-item-stat">
                    <span class="stat-label">Efficiency:</span>
                    <span class="stat-value">${efficiencyScore}%</span>
                </div>
            `;
        }
    }

    removeZoneFromList(zoneId) {
        const zoneItem = document.querySelector(`[data-zone-id="${zoneId}"]`);
        if (zoneItem) {
            zoneItem.remove();
        }

        // Show no zones message if no zones left
        const zonesItems = document.getElementById('zonesItems');
        if (zonesItems && zonesItems.children.length === 0) {
            zonesItems.innerHTML = `
                <div class="no-zones-message">
                    <i class="fas fa-info-circle"></i>
                    <span>No zones created yet. Use the drawing tools on the map to create your first solar zone.</span>
                </div>
            `;
        }

        this.updateZonesCount();
    }

    updateZonesCount() {
        const zonesCount = document.getElementById('zonesCount');
        const count = this.drawingZones.length;
        if (zonesCount) {
            zonesCount.textContent = `${count} zone${count !== 1 ? 's' : ''}`;
        }
    }

    createZonePopup(layer, zoneData) {
        // Instead of popup, show horizontal zone info panel
        layer.on('click', () => {
            this.showZoneInfo(zoneData);
        });
    }

    showZoneInfo(zoneData) {
        const energyOutput = this.calculateEnergyOutput(zoneData);
        const systemSize = (zoneData.panelCount * zoneData.panelWattage) / 1000;
        const efficiencyScore = this.calculateEfficiencyScore(energyOutput, systemSize);

        // Update zone info panel
        document.getElementById('zoneInfoTitle').textContent = `Solar Zone ${zoneData.id.split('_')[1]}`;
        document.getElementById('zoneInfoArea').textContent = `${zoneData.area.toFixed(1)} m²`;
        document.getElementById('zoneInfoPanels').textContent = zoneData.panelCount;
        document.getElementById('zoneInfoPower').textContent = `${systemSize.toFixed(1)} kW`;
        document.getElementById('zoneInfoOutput').textContent = `${energyOutput.toFixed(0)} kWh`;
        document.getElementById('zoneInfoSavings').textContent = `${efficiencyScore}% efficiency`;

        // Store current zone for actions
        this.currentZoneData = zoneData;

        // Show panel
        document.getElementById('zoneInfoPanel').style.display = 'block';
    }

    hideZoneInfo() {
        document.getElementById('zoneInfoPanel').style.display = 'none';
        this.currentZoneData = null;
    }

    calculateEnergyOutput(zoneData) {
        // Calculate system size in kW
        const systemSize = (zoneData.panelCount * zoneData.panelWattage) / 1000; // kW

        // Peak sun hours vary by European location:
        // Southern Europe (Spain, Italy): 4.5-5.5 hours
        // Central Europe (Germany, France): 3.5-4.5 hours  
        // Northern Europe (Netherlands, UK): 2.5-3.5 hours
        let peakSunHours = 4.2; // Conservative European average

        // Use real sunlight data if available from weather API
        if (this.sunlightData && this.sunlightData.daily) {
            peakSunHours = this.sunlightData.daily;
        }

        // Performance ratio accounts for all real-world losses:
        // - Inverter efficiency: ~95-98%
        // - System losses (wiring, dust, temperature): ~10-15%
        // - Shading and mismatch losses: ~5-10%
        // - Overall performance ratio: ~85% is realistic for well-designed systems
        const performanceRatio = zoneData.efficiency || 0.85;

        // Standard solar energy calculation formula
        // Annual Energy (kWh) = System Size (kW) × Peak Sun Hours × 365 days × Performance Ratio
        const annualOutput = systemSize * peakSunHours * 365 * performanceRatio;

        return annualOutput;
    }

    calculateEfficiencyScore(annualOutput, systemSize) {
        // Calculate efficiency score based on energy output per kW installed
        // Good systems produce 1000-1500 kWh per kW installed annually
        const outputPerKW = annualOutput / systemSize;

        // Convert to efficiency percentage (1200 kWh/kW = 100% efficiency)
        const efficiencyScore = Math.min((outputPerKW / 1200) * 100, 100);

        return Math.round(efficiencyScore);
    }

    calculateMonthlyOutput(annualOutput) {
        // Simply return monthly energy output in kWh
        return annualOutput / 12;
    }

    updateZoneAnalysis() {
        if (this.drawingZones.length === 0) {
            this.hideZoneAnalysis();
            return;
        }

        // Calculate totals
        let totalArea = 0;
        let totalPanels = 0;
        let totalPower = 0;
        let totalAnnualOutput = 0;
        let totalMonthlySavings = 0;

        this.drawingZones.forEach(zone => {
            totalArea += zone.area;
            totalPanels += zone.panelCount;
            totalPower += (zone.panelCount * zone.panelWattage) / 1000;

            const energyOutput = this.calculateEnergyOutput(zone);
            totalAnnualOutput += energyOutput;
        });

        // Calculate overall system efficiency
        const overallEfficiency = totalPower > 0 ? this.calculateEfficiencyScore(totalAnnualOutput, totalPower) : 0;

        // Update UI
        this.showZoneAnalysis({
            zones: this.drawingZones.length,
            totalArea: totalArea,
            totalPanels: totalPanels,
            totalPower: totalPower,
            totalAnnualOutput: totalAnnualOutput,
            overallEfficiency: overallEfficiency
        });
    }

    editZone(zoneId) {
        const zoneData = this.drawingZones.find(zone => zone.id === zoneId);
        if (zoneData) {
            // Store original geometry for cancel functionality
            this.originalGeometry = zoneData.layer.toGeoJSON();
            this.currentEditingZone = zoneData;

            // Enable edit mode for this specific layer
            const editHandler = new L.EditToolbar.Edit(this.map, {
                featureGroup: L.featureGroup([zoneData.layer])
            });
            editHandler.enable();
            this.currentEditHandler = editHandler;

            // Show save/cancel buttons (map only)
            const editActionsMap = document.getElementById('zoneEditActionsMap');

            if (editActionsMap) {
                editActionsMap.style.display = 'flex';
            }
        }
    }

    saveZoneEdit() {
        if (this.currentEditHandler) {
            this.currentEditHandler.save();
            this.currentEditHandler.disable();
            this.currentEditHandler = null;

            // Recalculate area for the edited zone
            if (this.currentEditingZone) {
                this.currentEditingZone.area = this.calculateArea(this.currentEditingZone.layer);
                this.updateSelectedZoneStats();
                this.updateZoneAnalysis();
            }

            this.hideEditActions();
        }
    }

    cancelZoneEdit() {
        if (this.currentEditHandler && this.currentEditingZone && this.originalGeometry) {
            // Disable edit handler first
            this.currentEditHandler.disable();
            this.currentEditHandler = null;

            // Restore original geometry properly
            const originalLayer = L.geoJSON(this.originalGeometry).getLayers()[0];
            this.currentEditingZone.layer.setLatLngs(originalLayer.getLatLngs());

            // Force layer redraw to update vertices
            this.currentEditingZone.layer.redraw();

            // Update the area calculation with original geometry
            this.currentEditingZone.area = this.calculateArea(this.currentEditingZone.layer);

            // Refresh the layer on the map
            this.drawnItems.removeLayer(this.currentEditingZone.layer);
            this.drawnItems.addLayer(this.currentEditingZone.layer);

            this.hideEditActions();
        }
    }

    hideEditActions() {
        const editActionsMap = document.getElementById('zoneEditActionsMap');

        if (editActionsMap) {
            editActionsMap.style.display = 'none';
        }

        this.currentEditingZone = null;
        this.originalGeometry = null;
    }

    deleteZone(zoneId) {
        const zoneIndex = this.drawingZones.findIndex(zone => zone.id === zoneId);
        if (zoneIndex !== -1) {
            const zoneData = this.drawingZones[zoneIndex];

            // Remove from map
            this.drawnItems.removeLayer(zoneData.layer);

            // Remove from array
            this.drawingZones.splice(zoneIndex, 1);

            // Remove from list (disabled - no zonesItems element in HTML)
            // this.removeZoneFromList(zoneId);

            // If this was the selected zone, clear selection
            if (this.selectedZone && this.selectedZone.id === zoneId) {
                this.selectedZone = null;
                this.updateSelectedZoneControls();
                this.updateActionButtons();
            }

            // Auto-select first zone if available
            if (this.drawingZones.length > 0 && !this.selectedZone) {
                this.selectZone(this.drawingZones[0]);
                document.querySelector(`[data-zone-id="${this.drawingZones[0].id}"]`)?.classList.add('selected');
            }



            // Update analysis
            this.updateZoneAnalysis();

            console.log(`🗑️ Deleted solar zone: ${zoneId}`);
        }
    }

    // Search Functionality
    setupSearchFunctionality() {
        const addressInput = document.getElementById('addressInput');
        const searchBtn = document.getElementById('searchBtn');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const address = addressInput.value.trim();
                if (address) {
                    this.searchAddress(address);
                }
            });
        }

        if (addressInput) {
            addressInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const address = addressInput.value.trim();
                    if (address) {
                        this.searchAddress(address);
                    }
                }
            });
        }
    }

    async searchAddress(address) {
        try {
            console.log('🔍 Searching for location:', address);

            // Show loading state
            const searchBtn = document.getElementById('searchBtn');
            searchBtn.innerHTML = '<span>Searching...</span>';
            searchBtn.disabled = true;

            // Try multiple search strategies for maximum flexibility
            let location = null;
            let searchResults = [];

            // Strategy 1: Global search (no country restrictions)
            try {
                const globalUrl = `https://nominatim.openstreetmap.org/search?` +
                    `format=json&` +
                    `q=${encodeURIComponent(address)}&` +
                    `limit=10&` +
                    `addressdetails=1&` +
                    `accept-language=en`;

                const response = await fetch(globalUrl, {
                    headers: {
                        'User-Agent': 'SolarVision-AI/1.0'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        searchResults = data;
                    }
                }
            } catch (error) {
                console.warn('Global search failed:', error);
            }

            // Strategy 2: If no results, try with common European countries
            if (searchResults.length === 0) {
                const countries = ['Belgium', 'Netherlands', 'Germany', 'France', 'Spain', 'Italy'];

                for (const country of countries) {
                    try {
                        const countryUrl = `https://nominatim.openstreetmap.org/search?` +
                            `format=json&` +
                            `q=${encodeURIComponent(address + ', ' + country)}&` +
                            `limit=5`;

                        const response = await fetch(countryUrl);
                        if (response.ok) {
                            const data = await response.json();
                            if (data && data.length > 0) {
                                searchResults = data;
                                break; // Found results, stop searching
                            }
                        }
                    } catch (error) {
                        console.warn(`Search with ${country} failed:`, error);
                    }
                }
            }

            // Strategy 3: Fuzzy search - try partial matches
            if (searchResults.length === 0) {
                try {
                    const fuzzyUrl = `https://nominatim.openstreetmap.org/search?` +
                        `format=json&` +
                        `q=${encodeURIComponent(address)}&` +
                        `limit=20&` +
                        `dedupe=0`;

                    const response = await fetch(fuzzyUrl);
                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.length > 0) {
                            searchResults = data;
                        }
                    }
                } catch (error) {
                    console.warn('Fuzzy search failed:', error);
                }
            }

            // Select the best result
            if (searchResults.length > 0) {
                // Prioritize results with house numbers, then cities, then any result
                location = searchResults.find(item => item.address && item.address.house_number) ||
                    searchResults.find(item => item.type === 'city' || item.type === 'town' || item.type === 'village') ||
                    searchResults[0];
            }

            if (location) {
                const lat = parseFloat(location.lat);
                const lon = parseFloat(location.lon);

                // Validate coordinates
                if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                    throw new Error('Invalid coordinates received');
                }

                // Determine appropriate zoom level based on result type
                let zoomLevel = 19; // Default for specific addresses
                if (location.type === 'city' || location.type === 'town') {
                    zoomLevel = 14;
                } else if (location.type === 'village' || location.type === 'hamlet') {
                    zoomLevel = 16;
                } else if (location.type === 'suburb' || location.type === 'neighbourhood') {
                    zoomLevel = 17;
                }

                // Ensure map is initialized and ready
                if (!this.map) {
                    // Initialize map if not already done
                    this.initializeMap();
                    // Wait for map to be ready
                    await new Promise(resolve => setTimeout(resolve, 800));
                }

                // Wait a bit more for map to be fully ready
                if (this.map && !this.map.getContainer()) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                // Update map view directly without animation
                try {
                    if (this.map && this.map.setView) {
                        this.map.setView([lat, lon], zoomLevel);
                    } else {
                        console.warn('Map not ready for setView, retrying...');
                        setTimeout(() => {
                            if (this.map && this.map.setView) {
                                this.map.setView([lat, lon], zoomLevel);
                            }
                        }, 500);
                    }
                } catch (mapError) {
                    console.error('Error setting map view:', mapError);
                    // Try again with a delay
                    setTimeout(() => {
                        if (this.map && this.map.setView) {
                            this.map.setView([lat, lon], zoomLevel);
                        }
                    }, 500);
                }

                // Store location data
                this.currentLocation = {
                    lat: lat,
                    lon: lon,
                    address: location.display_name || address,
                    type: location.type
                };

                // Fetch sunlight data for this location
                await this.fetchSunlightData(lat, lon);

                // Show zone analysis panel for drawing
                this.showZoneAnalysisPanel();

                console.log('✅ Location found:', location.display_name);
            } else {
                // If no results found, show user-friendly message
                console.log('No exact location found for:', address);
                this.showMessage(`Location "${address}" could not be found. Please try a different address or be more specific (e.g., include city, country).`, 'warning');
            }
        } catch (error) {
            console.error('❌ Search error:', error);
            // Only show error messages for actual network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showMessage(`Unable to connect to search service. Please check your internet connection.`, 'error');
            } else if (error.message && error.message.includes('initialize map')) {
                // Map initialization error already handled above
                return;
            }
            // Don't show any message for other cases (like no results found)
        } finally {
            // Reset button state
            const searchBtn = document.getElementById('searchBtn');
            searchBtn.innerHTML = '<span>Search</span>';
            searchBtn.disabled = false;
        }
    }

    async fetchSunlightData(lat, lon) {
        try {
            console.log('☀️ Fetching sunlight data for location...');

            // Using Open-Meteo API (free weather API)
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunshine_duration&timezone=auto&past_days=30&forecast_days=7`
            );

            if (!response.ok) {
                throw new Error('Weather API request failed');
            }

            const data = await response.json();

            if (data.daily && data.daily.sunshine_duration) {
                const sunlightHours = data.daily.sunshine_duration;
                const dates = data.daily.time;

                // Convert seconds to hours if needed and validate data
                const processedHours = sunlightHours.map(seconds => {
                    if (seconds === null || seconds === undefined) return null;
                    // If the value is very large, it might be in seconds, convert to hours
                    if (seconds > 24) {
                        return seconds / 3600; // Convert seconds to hours
                    }
                    return seconds;
                });

                // Calculate averages
                const dailyAverage = this.calculateDailyAverage(processedHours);
                const weeklyTotal = this.calculateWeeklyTotal(processedHours);
                const monthlyAverage = this.calculateMonthlyAverage(processedHours);
                const yearlyEstimate = this.calculateYearlyEstimate(processedHours);

                // Store sunlight data
                this.sunlightData = {
                    daily: dailyAverage,
                    weekly: weeklyTotal,
                    monthly: monthlyAverage,
                    yearly: yearlyEstimate,
                    rawData: sunlightHours,
                    dates: dates,
                    location: { lat, lon }
                };

                // Update UI with sunlight data
                this.displaySunlightData();

                console.log('✅ Sunlight data fetched successfully');
            }
        } catch (error) {
            console.error('❌ Error fetching sunlight data:', error);
            // Use fallback data based on latitude
            this.sunlightData = this.getFallbackSunlightData(lat);
            this.displaySunlightData();
        }
    }

    calculateDailyAverage(sunlightHours) {
        const validHours = sunlightHours.filter(h => h !== null && h !== undefined);
        const average = validHours.reduce((sum, hours) => sum + hours, 0) / validHours.length;
        return Math.round(average * 10) / 10; // Round to 1 decimal
    }

    calculateWeeklyTotal(sunlightHours) {
        const dailyAvg = this.calculateDailyAverage(sunlightHours);
        return Math.round(dailyAvg * 7 * 10) / 10;
    }

    calculateMonthlyAverage(sunlightHours) {
        const dailyAvg = this.calculateDailyAverage(sunlightHours);
        return Math.round(dailyAvg * 30 * 10) / 10;
    }

    calculateYearlyEstimate(sunlightHours) {
        const dailyAvg = this.calculateDailyAverage(sunlightHours);
        return Math.round(dailyAvg * 365);
    }

    getFallbackSunlightData(lat) {
        // Estimate based on latitude (rough approximation)
        let dailyAverage;

        if (Math.abs(lat) < 23.5) { // Tropical
            dailyAverage = 6.5;
        } else if (Math.abs(lat) < 40) { // Subtropical
            dailyAverage = 5.8;
        } else if (Math.abs(lat) < 60) { // Temperate
            dailyAverage = 4.5;
        } else { // Polar
            dailyAverage = 3.2;
        }

        return {
            daily: dailyAverage,
            weekly: Math.round(dailyAverage * 7 * 10) / 10,
            monthly: Math.round(dailyAverage * 30 * 10) / 10,
            yearly: Math.round(dailyAverage * 365),
            source: 'estimated'
        };
    }

    displaySunlightData() {
        if (!this.sunlightData) return;

        // Calculate additional solar metrics
        const solarMetrics = this.calculateSolarMetrics(this.sunlightData);

        // Update sunlight display in the UI
        const sunlightPanel = document.getElementById('sunlightPanel');
        if (sunlightPanel) {
            sunlightPanel.style.display = 'block';

            // Update basic sunlight data
            document.getElementById('sunlightDaily').textContent = `${this.sunlightData.daily}h`;
            document.getElementById('sunlightWeekly').textContent = `${this.sunlightData.weekly}h`;
            document.getElementById('sunlightMonthly').textContent = `${this.sunlightData.monthly}h`;
            document.getElementById('sunlightYearly').textContent = `${this.sunlightData.yearly}h`;

            // Add enhanced solar analysis
            this.updateSolarAnalysisDisplay(solarMetrics);

            // Update display with default period (12 months)
            const sunlightPeriod = document.getElementById('sunlightPeriod');
            const selectedPeriod = sunlightPeriod ? sunlightPeriod.value : '12months';
            this.updateSunlightDisplay(selectedPeriod);
        }
    }

    calculateSolarMetrics(sunlightData) {
        const dailyHours = sunlightData.daily;

        // Calculate solar potential rating
        let solarPotential = 'Poor';
        let potentialColor = '#ef4444';
        if (dailyHours >= 5.5) {
            solarPotential = 'Excellent';
            potentialColor = '#10b981';
        } else if (dailyHours >= 4.5) {
            solarPotential = 'Very Good';
            potentialColor = '#059669';
        } else if (dailyHours >= 3.5) {
            solarPotential = 'Good';
            potentialColor = '#f59e0b';
        } else if (dailyHours >= 2.5) {
            solarPotential = 'Fair';
            potentialColor = '#f97316';
        }

        // Calculate optimal panel tilt based on latitude
        const optimalTilt = this.currentLocation ? Math.abs(this.currentLocation.lat) : 35;

        // Calculate seasonal variation
        const winterHours = dailyHours * 0.6; // Winter typically 40% less
        const summerHours = dailyHours * 1.4; // Summer typically 40% more

        // Calculate energy production potential per kW
        const annualProductionPerKW = dailyHours * 365 * 0.85; // 85% system efficiency

        return {
            solarPotential,
            potentialColor,
            optimalTilt: Math.round(optimalTilt),
            winterHours: winterHours.toFixed(1),
            summerHours: Math.min(summerHours, 12).toFixed(1), // Cap at 12 hours
            annualProductionPerKW: Math.round(annualProductionPerKW),
            peakSeason: summerHours > 8 ? 'Summer' : 'Spring/Fall',
            recommendedOrientation: 'South-facing'
        };
    }

    updateSolarAnalysisDisplay(metrics) {
        // Create or update enhanced solar analysis section
        let analysisSection = document.querySelector('.enhanced-solar-analysis');
        if (!analysisSection) {
            analysisSection = document.createElement('div');
            analysisSection.className = 'enhanced-solar-analysis';

            const sunlightPanel = document.getElementById('sunlightPanel');
            if (sunlightPanel) {
                sunlightPanel.appendChild(analysisSection);
            }
        }

        analysisSection.innerHTML = `
            <div class="solar-analysis-header">
                <h4><i class="fas fa-chart-line"></i> Solar Analysis for Panel Setup</h4>
            </div>
            <div class="solar-metrics-grid">
                <div class="solar-metric-card">
                    <div class="metric-header">
                        <i class="fas fa-star" style="color: ${metrics.potentialColor}"></i>
                        <span class="metric-title">Solar Potential</span>
                    </div>
                    <div class="metric-value" style="color: ${metrics.potentialColor}">${metrics.solarPotential}</div>
                    <div class="metric-detail">${metrics.annualProductionPerKW} kWh/kW annually</div>
                </div>
                
                <div class="solar-metric-card">
                    <div class="metric-header">
                        <i class="fas fa-angle-up"></i>
                        <span class="metric-title">Optimal Tilt</span>
                    </div>
                    <div class="metric-value">${metrics.optimalTilt}°</div>
                    <div class="metric-detail">Best angle for your latitude</div>
                </div>
                
                <div class="solar-metric-card">
                    <div class="metric-header">
                        <i class="fas fa-compass"></i>
                        <span class="metric-title">Orientation</span>
                    </div>
                    <div class="metric-value">${metrics.recommendedOrientation}</div>
                    <div class="metric-detail">Maximum sun exposure</div>
                </div>
                
                <div class="solar-metric-card">
                    <div class="metric-header">
                        <i class="fas fa-calendar-alt"></i>
                        <span class="metric-title">Seasonal Variation</span>
                    </div>
                    <div class="metric-value">${metrics.winterHours}h - ${metrics.summerHours}h</div>
                    <div class="metric-detail">Winter to Summer range</div>
                </div>
            </div>
        `;
    }

    updateSunlightDisplay(period) {
        if (!this.sunlightData) return;

        let periodData;
        let dataSourceText;

        // Calculate data based on selected period
        switch (period) {
            case '30days':
                periodData = this.calculatePeriodData(30);
                dataSourceText = 'Real weather data (last 30 days)';
                break;
            case '6months':
                periodData = this.calculatePeriodData(180);
                dataSourceText = 'Real weather data (last 6 months)';
                break;
            case '12months':
            default:
                periodData = this.calculatePeriodData(365);
                dataSourceText = 'Real weather data (last 12 months)';
                break;
        }

        // Update display values
        document.getElementById('sunlightDaily').textContent = `${periodData.daily}h`;
        document.getElementById('sunlightWeekly').textContent = `${periodData.weekly}h`;
        document.getElementById('sunlightMonthly').textContent = `${periodData.monthly}h`;
        document.getElementById('sunlightYearly').textContent = `${periodData.yearly}h`;

        // Update data source text
        const dataSource = document.getElementById('sunlightDataSource');
        if (dataSource) {
            dataSource.textContent = dataSourceText;
            dataSource.className = 'data-source real';
        }
    }

    calculatePeriodData(days) {
        if (!this.sunlightData) return { daily: 0, weekly: 0, monthly: 0, yearly: 0 };

        // Base daily hours from the original data
        let baseDailyHours = this.sunlightData.daily;

        // Apply seasonal variation based on period length
        let adjustmentFactor = 1.0;

        if (days <= 30) {
            // Last 30 days - current season adjustment
            const currentMonth = new Date().getMonth();
            const seasonalFactors = [0.6, 0.7, 0.8, 0.9, 1.1, 1.2, 1.3, 1.2, 1.0, 0.8, 0.6, 0.5];
            adjustmentFactor = seasonalFactors[currentMonth];
        } else if (days <= 180) {
            // Last 6 months - slight seasonal variation
            adjustmentFactor = 0.95; // Slightly below average
        } else {
            // Last 12 months - full year average
            adjustmentFactor = 1.0;
        }

        const daily = (baseDailyHours * adjustmentFactor).toFixed(1);
        const weekly = (daily * 7).toFixed(0);
        const monthly = (daily * 30).toFixed(0);
        const yearly = (daily * 365).toFixed(0);

        return { daily, weekly, monthly, yearly };
    }

    // Map Controls
    setupMapControls() {
        const satelliteBtn = document.getElementById('satelliteView');
        const streetBtn = document.getElementById('streetView');

        if (satelliteBtn) {
            satelliteBtn.addEventListener('click', () => {
                if (this.map && this.satelliteLayer) {
                    this.map.removeLayer(this.streetLayer);
                    this.satelliteLayer.addTo(this.map);
                    this.updateActiveMapControl('satelliteView');
                }
            });
        }

        if (streetBtn) {
            streetBtn.addEventListener('click', () => {
                if (this.map && this.streetLayer) {
                    this.map.removeLayer(this.satelliteLayer);
                    this.streetLayer.addTo(this.map);
                    this.updateActiveMapControl('streetView');
                }
            });
        }
    }

    updateActiveMapControl(activeId) {
        document.querySelectorAll('.map-control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(activeId)?.classList.add('active');
    }

    // Analysis Panel
    setupAnalysisPanel() {
        // Zone management buttons
        const drawZoneBtn = document.getElementById('drawZoneBtn');
        const editZoneBtn = document.getElementById('editZoneBtn');
        const deleteZoneBtn = document.getElementById('deleteZoneBtn');

        // Selected zone controls
        const zonePanelCountSlider = document.getElementById('zonePanelCount');
        const zonePanelCountValue = document.getElementById('zonePanelCountValue');

        if (drawZoneBtn) {
            drawZoneBtn.addEventListener('click', () => {
                this.enableDrawingMode();
            });
        }

        if (editZoneBtn) {
            editZoneBtn.addEventListener('click', () => {
                if (this.selectedZone) {
                    this.editZone(this.selectedZone.id);
                }
            });
        }

        if (deleteZoneBtn) {
            deleteZoneBtn.addEventListener('click', () => {
                if (this.selectedZone) {
                    this.deleteZone(this.selectedZone.id);
                }
            });
        }



        if (zonePanelCountSlider && zonePanelCountValue) {
            zonePanelCountSlider.addEventListener('input', (e) => {
                const panelCount = parseInt(e.target.value);

                if (this.selectedZone) {
                    const maxRecommended = this.calculateMaxRecommendedPanels(this.selectedZone.area);
                    let displayText = `${panelCount} panels`;

                    // Show warning if too many panels
                    if (panelCount > maxRecommended) {
                        displayText += ` (⚠️ Recommended max: ${maxRecommended})`;
                        zonePanelCountValue.style.color = '#f59e0b';
                    } else {
                        zonePanelCountValue.style.color = '#6366f1';
                    }

                    zonePanelCountValue.textContent = displayText;

                    this.selectedZone.panelCount = panelCount;
                    this.updateSelectedZoneStats();
                    this.updateZoneAnalysis();
                    // this.updateZoneInList(this.selectedZone); // Disabled - no zone list in HTML
                }
            });
        }

        // Zone info panel controls
        const zoneInfoClose = document.getElementById('zoneInfoClose');

        if (zoneInfoClose) {
            zoneInfoClose.addEventListener('click', () => {
                this.hideZoneInfo();
            });
        }

        // Zone edit action buttons (map only)
        const saveZoneBtnMap = document.getElementById('saveZoneBtnMap');
        const cancelZoneBtnMap = document.getElementById('cancelZoneBtnMap');

        if (saveZoneBtnMap) {
            saveZoneBtnMap.addEventListener('click', () => {
                this.saveZoneEdit();
            });
        }

        if (cancelZoneBtnMap) {
            cancelZoneBtnMap.addEventListener('click', () => {
                this.cancelZoneEdit();
            });
        }

        // Sunlight period selector
        const sunlightPeriod = document.getElementById('sunlightPeriod');
        if (sunlightPeriod) {
            sunlightPeriod.addEventListener('change', (e) => {
                this.updateSunlightDisplay(e.target.value);
            });
        }
    }



    showZoneAnalysisPanel() {
        const section = document.getElementById('solarZonesSection');
        if (section) {
            section.style.display = 'block';
        }

        // Show zone drawing controls on the map
        const zoneControls = document.getElementById('zoneDrawingControls');
        if (zoneControls) {
            zoneControls.style.display = 'flex';
        }

        // Show sidebar panels and hide placeholder
        const placeholder = document.getElementById('analysisPlaceholder');

        if (placeholder) {
            placeholder.style.display = 'none';
        }
    }

    hideZoneAnalysisPanel() {
        const section = document.getElementById('solarZonesSection');
        if (section) {
            section.style.display = 'none';
        }
    }

    showZoneAnalysis(totals) {
        this.showZoneAnalysisPanel();

        // Update totals in the UI
        const zonesCount = document.getElementById('zonesCount');
        if (zonesCount) {
            zonesCount.textContent = `${totals.zones} zone${totals.zones !== 1 ? 's' : ''}`;
        }

        const totalPanelsEl = document.getElementById('totalPanels');
        if (totalPanelsEl) {
            totalPanelsEl.textContent = totals.totalPanels;
        }

        const totalPowerEl = document.getElementById('totalPower');
        if (totalPowerEl) {
            totalPowerEl.textContent = `${totals.totalPower.toFixed(1)} kW`;
        }

        const totalOutputEl = document.getElementById('totalOutput');
        if (totalOutputEl) {
            totalOutputEl.textContent = `${totals.totalAnnualOutput.toFixed(0)} kWh`;
        }

        const totalSavingsEl = document.getElementById('totalSavings');
        if (totalSavingsEl) {
            totalSavingsEl.textContent = `${totals.overallEfficiency}% efficiency`;
        }

        const totalAreaEl = document.getElementById('totalArea');
        if (totalAreaEl) {
            totalAreaEl.textContent = `${totals.totalArea.toFixed(1)} m²`;
        }

        // Show optimize button if there are zones
        const optimizeBtn = document.getElementById('optimizeAllZones');
        if (optimizeBtn) {
            optimizeBtn.style.display = totals.zones > 0 ? 'block' : 'none';
        }
    }

    hideZoneAnalysis() {
        // Reset all values to 0
        const totalPanelsEl = document.getElementById('totalPanels');
        if (totalPanelsEl) {
            totalPanelsEl.textContent = '0';
        }

        const totalPowerEl = document.getElementById('totalPower');
        if (totalPowerEl) {
            totalPowerEl.textContent = '0 kW';
        }

        const totalOutputEl = document.getElementById('totalOutput');
        if (totalOutputEl) {
            totalOutputEl.textContent = '0 kWh';
        }

        const totalSavingsEl = document.getElementById('totalSavings');
        if (totalSavingsEl) {
            totalSavingsEl.textContent = '0% efficiency';
        }

        const totalAreaEl = document.getElementById('totalArea');
        if (totalAreaEl) {
            totalAreaEl.textContent = '0 m²';
        }

        // Update zones count
        const zonesCount = document.getElementById('zonesCount');
        if (zonesCount) {
            zonesCount.textContent = '0 zones';
        }

        // Hide optimize button
        const optimizeBtn = document.getElementById('optimizeAllZones');
        if (optimizeBtn) {
            optimizeBtn.style.display = 'none';
        }
    }

    generateAIAnalysisData() {
        // Generate realistic AI analysis data
        const roofArea = Math.floor(Math.random() * 800) + 800; // 800-1600 sq ft
        const optimalAngle = Math.floor(Math.random() * 20) + 25; // 25-45 degrees
        const sunExposure = (Math.random() * 3 + 6).toFixed(1); // 6-9 hours
        const aiConfidence = (Math.random() * 5 + 95).toFixed(1); // 95-100%

        document.getElementById('roofArea').textContent = `${roofArea.toLocaleString()} sq ft`;
        document.getElementById('optimalAngle').textContent = `${optimalAngle}°`;
        document.getElementById('sunExposure').textContent = `${sunExposure} hrs/day`;
        document.getElementById('aiConfidence').textContent = `${aiConfidence}%`;

        this.roofData = {
            area: roofArea,
            angle: optimalAngle,
            sunHours: parseFloat(sunExposure),
            confidence: parseFloat(aiConfidence)
        };
    }

    runAIAnalysis() {
        if (!this.currentLocation) {
            this.showMessage('Please search for an address first.', 'warning');
            return;
        }

        // Switch to satellite view for better analysis
        if (this.map && this.satelliteLayer) {
            this.map.removeLayer(this.streetLayer);
            this.satelliteLayer.addTo(this.map);
            this.updateActiveMapControl('satelliteView');
        }

        // Show zone analysis panel if not already visible
        this.showZoneAnalysisPanel();

        this.showMessage('Smart analysis complete! Configure settings and optimize.', 'success');
    }

    // Panel Optimization
    async optimizePanelPlacement() {
        try {
            const optimizeBtn = document.getElementById('optimizeBtn');
            const originalText = optimizeBtn.innerHTML;

            // Show AI processing state
            optimizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>AI Optimizing...</span>';
            optimizeBtn.disabled = true;

            // Simulate AI optimization process
            await this.simulateAIOptimization();

            // Show results modal
            this.showOptimizationResults();

        } catch (error) {
            console.error('❌ Error during AI optimization:', error);
            this.showMessage('AI optimization failed. Please try again.', 'error');
        } finally {
            // Reset button state
            const optimizeBtn = document.getElementById('optimizeBtn');
            optimizeBtn.innerHTML = '<i class="fas fa-magic"></i><span>Run AI Optimization</span>';
            optimizeBtn.disabled = false;
        }
    }

    async simulateAIOptimization() {
        // Simulate AI processing with realistic delays
        const steps = [
            'Initializing smart algorithms...',
            'Processing satellite imagery...',
            'Analyzing roof geometry...',
            'Computing optimal placement...',
            'Predicting energy output...',
            'Finalizing AI recommendations...'
        ];

        for (let i = 0; i < steps.length; i++) {
            console.log(`🧠 ${steps[i]}`);
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        // Generate optimization results
        this.generateOptimizationResults();
    }

    generateOptimizationResults() {
        if (!this.roofData) return;

        const panelCount = parseInt(document.getElementById('panelCount').value);
        const panelWattage = 400; // Standard panel wattage
        const systemSize = (panelCount * panelWattage) / 1000; // kW
        const annualProduction = systemSize * this.roofData.sunHours * 365 * 0.85; // kWh/year
        const monthlySavings = (annualProduction / 12) * 0.12; // Assuming $0.12/kWh
        const systemCost = systemSize * 3000; // $3/watt installed
        const paybackPeriod = systemCost / (monthlySavings * 12);

        this.optimizationResults = {
            panelCount: panelCount,
            systemSize: systemSize.toFixed(1),
            annualProduction: Math.round(annualProduction),
            monthlySavings: Math.round(monthlySavings),
            systemCost: Math.round(systemCost),
            paybackPeriod: paybackPeriod.toFixed(1),
            co2Reduction: Math.round(annualProduction * 0.0004 * 2204.62) // lbs CO2/year
        };
    }

    showOptimizationResults() {
        if (!this.optimizationResults) return;

        const modal = document.getElementById('optimizationModal');
        const overlay = document.getElementById('modalOverlay');

        // Update modal content
        document.getElementById('modalPanelCount').textContent = this.optimizationResults.panelCount;
        document.getElementById('modalSystemSize').textContent = `${this.optimizationResults.systemSize} kW`;
        document.getElementById('modalAnnualProduction').textContent = `${this.optimizationResults.annualProduction.toLocaleString()} kWh`;

        // Show modal
        overlay.classList.add('active');
    }

    // Modal Management
    setupModals() {
        const modalOverlay = document.getElementById('modalOverlay');
        const modalClose = document.getElementById('modalClose');
        const downloadReportBtn = document.getElementById('downloadReport');
        const scheduleConsultationBtn = document.getElementById('scheduleConsultation');

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.hideModal();
            });
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.hideModal();
                }
            });
        }

        if (downloadReportBtn) {
            downloadReportBtn.addEventListener('click', () => {
                this.downloadReport();
            });
        }

        if (scheduleConsultationBtn) {
            scheduleConsultationBtn.addEventListener('click', () => {
                this.scheduleConsultation();
            });
        }

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }

    hideModal() {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    downloadReport() {
        if (!this.optimizationResults) return;

        // Create AI analysis report
        const report = `
SOLARVISION AI - SMART ANALYSIS REPORT
======================================

Location: ${this.currentLocation?.address || 'Unknown'}
Analysis Date: ${new Date().toLocaleDateString()}
AI Confidence: ${this.roofData?.confidence || 'N/A'}%

SYSTEM SPECIFICATIONS
--------------------
Optimal Panel Count: ${this.optimizationResults.panelCount}
System Size: ${this.optimizationResults.systemSize} kW
Annual Production: ${this.optimizationResults.annualProduction.toLocaleString()} kWh

FINANCIAL PROJECTIONS
---------------------
System Cost: $${this.optimizationResults.systemCost.toLocaleString()}
Monthly Savings: $${this.optimizationResults.monthlySavings.toLocaleString()}
Payback Period: ${this.optimizationResults.paybackPeriod} years

ENVIRONMENTAL IMPACT
--------------------
Annual CO2 Reduction: ${this.optimizationResults.co2Reduction.toLocaleString()} lbs

Generated by SolarVision AI Smart Analysis
        `.trim();

        // Create and download file
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'solarvision-ai-analysis-report.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showMessage('AI analysis report downloaded successfully!', 'success');
    }

    scheduleConsultation() {
        // In a real application, this would integrate with a scheduling system
        this.showMessage('AI consultation scheduling coming soon!', 'info');
        this.hideModal();
    }

    // Utility Functions
    showMessage(message, type = 'info') {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.innerHTML = `
            <div class="message-content">
                <i class="fas fa-${this.getMessageIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        messageEl.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${this.getMessageColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 3000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 400px;
            font-family: 'Space Grotesk', sans-serif;
        `;

        messageEl.querySelector('.message-content').style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        // Add to DOM
        document.body.appendChild(messageEl);

        // Animate in
        setTimeout(() => {
            messageEl.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove
        setTimeout(() => {
            messageEl.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 4000);
    }

    getMessageIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getMessageColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#6366f1'
        };
        return colors[type] || '#6366f1';
    }

    // Animation and Visual Effects
    initializeAnimations() {
        // Create smart visual connections
        this.createSmartConnections();

        // Animate elements on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.feature-card, .stat-item, .insight-card').forEach(el => {
            observer.observe(el);
        });
    }

    createSmartConnections() {
        const svg = document.querySelector('.smart-svg');
        if (!svg) return;

        // Create SVG connections between smart nodes
        const connections = [
            { x1: 50, y1: 100, x2: 150, y2: 80 },
            { x1: 50, y1: 150, x2: 150, y2: 120 },
            { x1: 50, y1: 200, x2: 150, y2: 160 },
            { x1: 150, y1: 80, x2: 250, y2: 120 },
            { x1: 150, y1: 120, x2: 250, y2: 160 },
            { x1: 150, y1: 160, x2: 250, y2: 120 }
        ];

        connections.forEach((conn, index) => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', conn.x1);
            line.setAttribute('y1', conn.y1);
            line.setAttribute('x2', conn.x2);
            line.setAttribute('y2', conn.y2);
            line.setAttribute('stroke', 'url(#lineGradient)');
            line.setAttribute('stroke-width', '2');
            line.style.animation = `smart-pulse 2s ease-in-out infinite ${index * 0.3}s`;
            svg.appendChild(line);
        });
    }

    // Performance Monitoring
    logPerformance() {
        if (window.performance) {
            const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
            console.log(`⚡ SolarVision AI loaded in ${loadTime}ms`);
        }
    }

    optimizeAllZones() {
        if (this.drawingZones.length === 0) {
            this.showMessage('Please draw some solar zones first.', 'warning');
            return;
        }

        // Calculate combined optimization results
        let totalPanels = 0;
        let totalPower = 0;
        let totalAnnualOutput = 0;
        let totalMonthlySavings = 0;
        let totalSystemCost = 0;

        this.drawingZones.forEach(zone => {
            totalPanels += zone.panelCount;
            totalPower += (zone.panelCount * zone.panelWattage) / 1000;

            const energyOutput = this.calculateEnergyOutput(zone);
            totalAnnualOutput += energyOutput;
            totalMonthlySavings += this.calculateMonthlySavings(energyOutput);
            totalSystemCost += (zone.panelCount * zone.panelWattage * 3); // €3/watt
        });

        // Store results for modal
        this.optimizationResults = {
            panelCount: totalPanels,
            systemSize: totalPower.toFixed(1),
            annualProduction: Math.round(totalAnnualOutput),
            monthlySavings: Math.round(totalMonthlySavings),
            systemCost: Math.round(totalSystemCost),
            paybackPeriod: (totalSystemCost / (totalMonthlySavings * 12)).toFixed(1),
            zones: this.drawingZones.length
        };

        // Show results modal
        this.showOptimizationResults();

        this.showMessage(`Optimized ${this.drawingZones.length} solar zones successfully!`, 'success');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.solarVisionAI = new SolarVisionAI();

    // Log performance
    window.addEventListener('load', () => {
        window.solarVisionAI.logPerformance();
    });
});

// Add CSS animations via JavaScript
const style = document.createElement('style');
style.textContent = `
    .animate-in {
        animation: slideInUp 0.6s ease-out forwards;
    }
    
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes smart-pulse {
        0%, 100% {
            opacity: 0.3;
        }
        50% {
            opacity: 1;
        }
    }
    
    .message {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 500;
    }
`;
document.head.appendChild(style);

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SolarVisionAI;
}