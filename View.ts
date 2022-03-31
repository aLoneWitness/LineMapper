/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { StyleSet, Theme } from "@here/harp-datasource-protocol";
import { LongPressHandler, MapControls } from "@here/harp-map-controls";
import { MapAnchor, MapView } from "@here/harp-mapview";
import { VectorTileDataSource } from "@here/harp-vectortile-datasource";
import { FeaturesDataSource } from "@here/harp-features-datasource";
import * as THREE from "three";
import geojson from './geo.json';
import trainjson from './trains.json'
import { GeoCoordinates, GeoPointLike, isGeoPointLike } from "@here/harp-geoutils";

const defaultTheme = "resources/berlin_tilezen_base.json";

export interface ViewParameters {
    theme?: string | Theme;
    canvas: HTMLCanvasElement;
}

export class View {
    readonly canvas: HTMLCanvasElement;
    readonly theme: string | Theme;

    readonly mapView: MapView;

    readonly scale = 400;
    readonly geometry = new THREE.BoxGeometry(1 * this.scale, 1 * this.scale, 1 * this.scale);
    readonly prePassMaterial = new THREE.MeshStandardMaterial({
        color: "#ff00fe",
        opacity: 0.3,
        depthTest: false,
        transparent: true
    });
    readonly material = new THREE.MeshStandardMaterial({
        color: "#ff00fe",
        opacity: 0.9,
        transparent: true
    });

    constructor(args: ViewParameters) {
        this.canvas = args.canvas;
        this.theme = args.theme === undefined ? defaultTheme : args.theme;
        this.mapView = this.initialize();

        this.addMouseEventListener(this.mapView);
    }

    createPinkCube(): MapAnchor<THREE.Object3D> {
        // To avoid not seeing the cube at all if it is fully behind the buildings
        // and also to have some nice visuals if it is partially occluded we
        // render two passes:
        // 1. render the cube semi-transparent w/o depth test (renders entire cube)
        // 2. render the cube almost opaque w/ depth test (renders only un-occluded part)
        const cube = new THREE.Object3D();

        const prePassMesh = new THREE.Mesh(this.geometry, this.prePassMaterial);
        prePassMesh.renderOrder = Number.MAX_SAFE_INTEGER - 1;
        cube.add(prePassMesh);

        const mesh = new THREE.Mesh(this.geometry, this.material);
        mesh.renderOrder = Number.MAX_SAFE_INTEGER;
        cube.add(mesh);
        return cube;
    }

    protected initialize(): MapView {
        const mapView = new MapView({
            canvas: this.canvas,
            theme: this.theme,
            decoderUrl: "decoder.bundle.js"
        });

        const dataSource = new VectorTileDataSource({
            authenticationCode: process.env.HERE_API_KEY,
        });
        mapView.addDataSource(dataSource);

        MapControls.create(mapView);

        const customTheme: Theme = {
            extends: "resources/berlin_tilezen_effects_outlines.json",
            styles: {
                geojson: getStyleSet()
            }
        }

        mapView.setTheme(customTheme)
        // .then(() => {
            // mapView.loadPostEffects("resources/effects_outlines.json");
        // })

        const featuresDataSource = new FeaturesDataSource({ styleSetName: "geojson" });
        mapView.addDataSource(featuresDataSource);
        featuresDataSource.setFromGeojson((<any>geojson));

        for (const train of trainjson.treinen) {
            const cube = this.createPinkCube();
            
            const geocord = GeoCoordinates.fromGeoPoint([train.lng, train.lat])
            geocord.altitude = 50;
            console.log(geocord)
            cube.anchor = geocord;
            mapView.mapAnchors.add(cube);
        }

        mapView.update()

        return mapView;
    }

    addMouseEventListener(mapView: MapView) {
        const canvas = mapView.canvas;
        mapView.zoomLevel = 15.5;
    
        new LongPressHandler(canvas, event => {
            // // snippet:harp_gl_threejs_add_simple_object_1.ts
            // // Get the position of the mouse in geo space.
            const geoPosition = mapView.getGeoCoordinatesAt(event.pageX, event.pageY);
            if (geoPosition === null) {
                return;
            }
            console.log(geoPosition)
            // // Add somealtitude so that the cube is standing on the ground.
            // geoPosition.altitude = 50;
            // // end:harp_gl_threejs_add_simple_object_1.ts
    
            // // snippet:harp_gl_threejs_add_simple_object_2.ts
            // const cube = this.createPinkCube();
            // cube.anchor = geoPosition;
            // mapView.mapAnchors.add(cube);
            // // end:harp_gl_threejs_add_simple_object_2.ts
    
            // // end:harp_gl_threejs_add_simple_object_3.ts
            // // Request an update once the cube [[MapObject]] is added to [[MapView]].
            // mapView.update();
            // // end:harp_gl_threejs_add_simple_object_3.ts
            
        });
    }

    
}


function getStyleSet(): StyleSet {
    return [
        {
            when: "$geometryType == 'polygon'",
            technique: "fill",
            renderOrder: 10000,
            attr: {
                color: "#7cf",
                transparent: true,
                opacity: 0.8,
                lineWidth: 1,
                lineColor: "#003344"
            }
        },
        {
            when: "$geometryType == 'polygon'",
            technique: "solid-line",
            renderOrder: 10001,
            attr: {
                color: "#8df",
                metricUnit: "Pixel",
                lineWidth: 5
            }
        },
        {
            when: "$geometryType == 'point'",
            technique: "circles",
            renderOrder: 10002,
            attr: {
                size: 10,
                color: "#5ad"
            }
        },
        {
            when: "$geometryType == 'line'",
            technique: "solid-line",
            renderOrder: 10000,
            attr: {
                color: "#8df",
                metricUnit: "Pixel",
                lineWidth: 5
            }
        }
    ];
}

