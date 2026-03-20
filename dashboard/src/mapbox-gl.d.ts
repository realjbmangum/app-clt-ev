declare module 'mapbox-gl' {
  export default mapboxgl
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace mapboxgl {
    let accessToken: string

    class Map {
      constructor(options: any)
      addControl(control: any, position?: string): this
      addSource(id: string, source: any): this
      addLayer(layer: any): this
      getSource(id: string): any
      getCanvas(): HTMLCanvasElement
      on(type: string, layerOrCallback: any, callback?: any): this
      remove(): void
      resize(): void
      isStyleLoaded(): boolean
    }

    class NavigationControl {
      constructor(options?: any)
    }

    class Popup {
      constructor(options?: any)
      setLngLat(lnglat: [number, number]): this
      setHTML(html: string): this
      addTo(map: Map): this
      remove(): void
    }

    interface MapLayerMouseEvent {
      features?: any[]
      lngLat: { lng: number; lat: number }
      point: { x: number; y: number }
    }

    type GeoJSONSource = {
      setData(data: any): void
    }
  }
}

declare module 'mapbox-gl/dist/mapbox-gl.css'
