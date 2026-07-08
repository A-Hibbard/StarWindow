{
    "views": [
    ],
    "schema": "public",
    "tables": [
        {
            "name": "body_positions",
            "columns": [
                {
                    "name": "body_position_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "body_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "location_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "observed_date",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "date",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "altitude_degrees",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric(8,4)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "azimuth_degrees",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric(8,4)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "distance_from_earth_km",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric(18,4)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "right_ascension",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric(10,6)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "declination",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric(10,6)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "constellation_id",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "magnitude",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric(10,4)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "elongation",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric(10,4)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "cached_at",
                    "default": "now()",
                    "identity": null,
                    "nullable": false,
                    "data_type": "timestamp with time zone",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "body_positions_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX body_positions_pkey ON public.body_positions USING btree (body_position_id)",
                    "primary_key_index": true
                },
                {
                    "name": "uq_body_positions_body_location_date",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX uq_body_positions_body_location_date ON public.body_positions USING btree (body_id, location_id, observed_date)",
                    "primary_key_index": false
                }
            ],
            "constraints": [
                {
                    "name": "body_positions_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (body_position_id)"
                },
                {
                    "name": "chk_body_positions_altitude",
                    "type": "CHECK",
                    "definition": "CHECK (altitude_degrees IS NULL OR altitude_degrees >= '-90'::integer::numeric AND altitude_degrees <= 90::numeric)"
                },
                {
                    "name": "chk_body_positions_azimuth",
                    "type": "CHECK",
                    "definition": "CHECK (azimuth_degrees IS NULL OR azimuth_degrees >= 0::numeric AND azimuth_degrees <= 360::numeric)"
                },
                {
                    "name": "fk_body_positions_body",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (body_id) REFERENCES celestial_bodies(body_id) ON UPDATE CASCADE ON DELETE CASCADE"
                },
                {
                    "name": "fk_body_positions_constellation",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (constellation_id) REFERENCES constellations(constellation_id) ON UPDATE CASCADE ON DELETE SET NULL"
                },
                {
                    "name": "fk_body_positions_location",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (location_id) REFERENCES locations(location_id) ON UPDATE CASCADE ON DELETE CASCADE"
                },
                {
                    "name": "uq_body_positions_body_location_date",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (body_id, location_id, observed_date)"
                }
            ],
            "description": null
        },
        {
            "name": "celestial_bodies",
            "columns": [
                {
                    "name": "body_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "name",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(100)",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "celestial_bodies_name_key",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX celestial_bodies_name_key ON public.celestial_bodies USING btree (name)",
                    "primary_key_index": false
                },
                {
                    "name": "celestial_bodies_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX celestial_bodies_pkey ON public.celestial_bodies USING btree (body_id)",
                    "primary_key_index": true
                }
            ],
            "constraints": [
                {
                    "name": "celestial_bodies_name_key",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (name)"
                },
                {
                    "name": "celestial_bodies_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (body_id)"
                }
            ],
            "description": null
        },
        {
            "name": "constellations",
            "columns": [
                {
                    "name": "constellation_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "short_name",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(10)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "full_name",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(100)",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "constellations_full_name_key",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX constellations_full_name_key ON public.constellations USING btree (full_name)",
                    "primary_key_index": false
                },
                {
                    "name": "constellations_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX constellations_pkey ON public.constellations USING btree (constellation_id)",
                    "primary_key_index": true
                },
                {
                    "name": "constellations_short_name_key",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX constellations_short_name_key ON public.constellations USING btree (short_name)",
                    "primary_key_index": false
                }
            ],
            "constraints": [
                {
                    "name": "constellations_full_name_key",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (full_name)"
                },
                {
                    "name": "constellations_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (constellation_id)"
                },
                {
                    "name": "constellations_short_name_key",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (short_name)"
                }
            ],
            "description": null
        },
        {
            "name": "event_bodies",
            "columns": [
                {
                    "name": "event_body_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "event_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "body_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "event_bodies_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX event_bodies_pkey ON public.event_bodies USING btree (event_body_id)",
                    "primary_key_index": true
                },
                {
                    "name": "uq_event_bodies_event_body",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX uq_event_bodies_event_body ON public.event_bodies USING btree (event_id, body_id)",
                    "primary_key_index": false
                }
            ],
            "constraints": [
                {
                    "name": "event_bodies_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (event_body_id)"
                },
                {
                    "name": "fk_event_bodies_body",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (body_id) REFERENCES celestial_bodies(body_id) ON UPDATE CASCADE ON DELETE RESTRICT"
                },
                {
                    "name": "fk_event_bodies_event",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (event_id) REFERENCES events(event_id) ON UPDATE CASCADE ON DELETE CASCADE"
                },
                {
                    "name": "uq_event_bodies_event_body",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (event_id, body_id)"
                }
            ],
            "description": null
        },
        {
            "name": "event_location",
            "columns": [
                {
                    "name": "event_location_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "event_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "location_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "event_location_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX event_location_pkey ON public.event_location USING btree (event_location_id)",
                    "primary_key_index": true
                },
                {
                    "name": "uq_event_location_event_location",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX uq_event_location_event_location ON public.event_location USING btree (event_id, location_id)",
                    "primary_key_index": false
                }
            ],
            "constraints": [
                {
                    "name": "event_location_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (event_location_id)"
                },
                {
                    "name": "fk_event_location_event",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (event_id) REFERENCES events(event_id) ON UPDATE CASCADE ON DELETE CASCADE"
                },
                {
                    "name": "fk_event_location_location",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (location_id) REFERENCES locations(location_id) ON UPDATE CASCADE ON DELETE RESTRICT"
                },
                {
                    "name": "uq_event_location_event_location",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (event_id, location_id)"
                }
            ],
            "description": null
        },
        {
            "name": "event_types",
            "columns": [
                {
                    "name": "event_type_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "event_type",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(100)",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "event_types_event_type_key",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX event_types_event_type_key ON public.event_types USING btree (event_type)",
                    "primary_key_index": false
                },
                {
                    "name": "event_types_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX event_types_pkey ON public.event_types USING btree (event_type_id)",
                    "primary_key_index": true
                }
            ],
            "constraints": [
                {
                    "name": "event_types_event_type_key",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (event_type)"
                },
                {
                    "name": "event_types_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (event_type_id)"
                }
            ],
            "description": null
        },
        {
            "name": "events",
            "columns": [
                {
                    "name": "event_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "name",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(255)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "start_time",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "timestamp with time zone",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "end_time",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "timestamp with time zone",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "date_precision",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "character varying(50)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "description",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "type_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "webcast_live",
                    "default": "false",
                    "identity": null,
                    "nullable": false,
                    "data_type": "boolean",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "video_url",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "image_url",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "events_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX events_pkey ON public.events USING btree (event_id)",
                    "primary_key_index": true
                }
            ],
            "constraints": [
                {
                    "name": "chk_events_time_range",
                    "type": "CHECK",
                    "definition": "CHECK (end_time IS NULL OR end_time >= start_time)"
                },
                {
                    "name": "events_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (event_id)"
                },
                {
                    "name": "fk_events_event_type",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (type_id) REFERENCES event_types(event_type_id) ON UPDATE CASCADE ON DELETE RESTRICT"
                }
            ],
            "description": null
        },
        {
            "name": "iss_passes",
            "columns": [
                {
                    "name": "iss_pass_id",
                    "default": "nextval('iss_passes_iss_pass_id_seq'::regclass)",
                    "identity": null,
                    "nullable": false,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "location_id",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "rise_time",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "timestamp with time zone",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "rise_compass",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "peak_time",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "timestamp with time zone",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "peak_compass",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "peak_elevation_deg",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "set_time",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "timestamp with time zone",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "set_compass",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "duration_sec",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "visible_duration_sec",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "visible",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "boolean",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "tle_epoch",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "timestamp with time zone",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "cached_at",
                    "default": "now()",
                    "identity": null,
                    "nullable": false,
                    "data_type": "timestamp with time zone",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "iss_passes_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX iss_passes_pkey ON public.iss_passes USING btree (iss_pass_id)",
                    "primary_key_index": true
                }
            ],
            "constraints": [
                {
                    "name": "chk_iss_duration_nonnegative",
                    "type": "CHECK",
                    "definition": "CHECK (duration_sec IS NULL OR duration_sec >= 0)"
                },
                {
                    "name": "chk_iss_peak_elevation_valid",
                    "type": "CHECK",
                    "definition": "CHECK (peak_elevation_deg IS NULL OR peak_elevation_deg >= 0::numeric AND peak_elevation_deg <= 90::numeric)"
                },
                {
                    "name": "chk_iss_visible_duration_nonnegative",
                    "type": "CHECK",
                    "definition": "CHECK (visible_duration_sec IS NULL OR visible_duration_sec >= 0)"
                },
                {
                    "name": "chk_iss_visible_duration_valid",
                    "type": "CHECK",
                    "definition": "CHECK (visible_duration_sec IS NULL OR duration_sec IS NULL OR visible_duration_sec <= duration_sec)"
                },
                {
                    "name": "iss_passes_location_id_fkey",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (location_id) REFERENCES locations(location_id) ON DELETE CASCADE"
                },
                {
                    "name": "iss_passes_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (iss_pass_id)"
                }
            ],
            "description": null
        },
        {
            "name": "launch_statuses",
            "columns": [
                {
                    "name": "launch_status_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "status",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(100)",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "launch_statuses_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX launch_statuses_pkey ON public.launch_statuses USING btree (launch_status_id)",
                    "primary_key_index": true
                },
                {
                    "name": "launch_statuses_status_key",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX launch_statuses_status_key ON public.launch_statuses USING btree (status)",
                    "primary_key_index": false
                }
            ],
            "constraints": [
                {
                    "name": "launch_statuses_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (launch_status_id)"
                },
                {
                    "name": "launch_statuses_status_key",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (status)"
                }
            ],
            "description": null
        },
        {
            "name": "locations",
            "columns": [
                {
                    "name": "location_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "name",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(200)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "description",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "lat",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric(9,6)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "long",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric(9,6)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "country",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "character varying(100)",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "locations_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX locations_pkey ON public.locations USING btree (location_id)",
                    "primary_key_index": true
                },
                {
                    "name": "uq_locations_name_coordinates",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX uq_locations_name_coordinates ON public.locations USING btree (name, lat, long)",
                    "primary_key_index": false
                }
            ],
            "constraints": [
                {
                    "name": "locations_lat_check",
                    "type": "CHECK",
                    "definition": "CHECK (lat >= '-90'::integer::numeric AND lat <= 90::numeric)"
                },
                {
                    "name": "locations_long_check",
                    "type": "CHECK",
                    "definition": "CHECK (long >= '-180'::integer::numeric AND long <= 180::numeric)"
                },
                {
                    "name": "locations_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (location_id)"
                },
                {
                    "name": "uq_locations_name_coordinates",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (name, lat, long)"
                }
            ],
            "description": null
        },
        {
            "name": "missions",
            "columns": [
                {
                    "name": "mission_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "name",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(255)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "mission_type",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "character varying(100)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "description",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "missions_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX missions_pkey ON public.missions USING btree (mission_id)",
                    "primary_key_index": true
                }
            ],
            "constraints": [
                {
                    "name": "missions_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (mission_id)"
                }
            ],
            "description": null
        },
        {
            "name": "moon_phases",
            "columns": [
                {
                    "name": "moon_phase_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "location_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "phase_date",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "date",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "phase_string",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(100)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "phase_fraction",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric(6,5)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "phase_angle",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric(8,4)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "cached_at",
                    "default": "now()",
                    "identity": null,
                    "nullable": false,
                    "data_type": "timestamp with time zone",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "moon_phases_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX moon_phases_pkey ON public.moon_phases USING btree (moon_phase_id)",
                    "primary_key_index": true
                },
                {
                    "name": "uq_moon_phases_location_date",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX uq_moon_phases_location_date ON public.moon_phases USING btree (location_id, phase_date)",
                    "primary_key_index": false
                }
            ],
            "constraints": [
                {
                    "name": "chk_moon_phases_fraction",
                    "type": "CHECK",
                    "definition": "CHECK (phase_fraction IS NULL OR phase_fraction >= 0::numeric AND phase_fraction <= 1::numeric)"
                },
                {
                    "name": "fk_moon_phases_location",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (location_id) REFERENCES locations(location_id) ON UPDATE CASCADE ON DELETE CASCADE"
                },
                {
                    "name": "moon_phases_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (moon_phase_id)"
                },
                {
                    "name": "uq_moon_phases_location_date",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (location_id, phase_date)"
                }
            ],
            "description": null
        },
        {
            "name": "news_articles",
            "columns": [
                {
                    "name": "news_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "title",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(500)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "summary",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "url",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "image_url",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "published_at",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "timestamp with time zone",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "source",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "character varying(255)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "cached_at",
                    "default": "now()",
                    "identity": null,
                    "nullable": false,
                    "data_type": "timestamp with time zone",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "news_articles_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX news_articles_pkey ON public.news_articles USING btree (news_id)",
                    "primary_key_index": true
                },
                {
                    "name": "news_articles_url_key",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX news_articles_url_key ON public.news_articles USING btree (url)",
                    "primary_key_index": false
                }
            ],
            "constraints": [
                {
                    "name": "news_articles_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (news_id)"
                },
                {
                    "name": "news_articles_url_key",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (url)"
                }
            ],
            "description": null
        },
        {
            "name": "pads",
            "columns": [
                {
                    "name": "pad_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "name",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(255)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "location_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "pads_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX pads_pkey ON public.pads USING btree (pad_id)",
                    "primary_key_index": true
                },
                {
                    "name": "uq_pads_name_location",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX uq_pads_name_location ON public.pads USING btree (name, location_id)",
                    "primary_key_index": false
                }
            ],
            "constraints": [
                {
                    "name": "fk_pads_location",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (location_id) REFERENCES locations(location_id) ON UPDATE CASCADE ON DELETE RESTRICT"
                },
                {
                    "name": "pads_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (pad_id)"
                },
                {
                    "name": "uq_pads_name_location",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (name, location_id)"
                }
            ],
            "description": null
        },
        {
            "name": "providers",
            "columns": [
                {
                    "name": "provider_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "name",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(200)",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "providers_name_key",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX providers_name_key ON public.providers USING btree (name)",
                    "primary_key_index": false
                },
                {
                    "name": "providers_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX providers_pkey ON public.providers USING btree (provider_id)",
                    "primary_key_index": true
                }
            ],
            "constraints": [
                {
                    "name": "providers_name_key",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (name)"
                },
                {
                    "name": "providers_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (provider_id)"
                }
            ],
            "description": null
        },
        {
            "name": "rocket_launch",
            "columns": [
                {
                    "name": "launch_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "event_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "name",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(255)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "status",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "character varying(100)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "net_precision",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "character varying(50)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "mission_id",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "rocket_id",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "provider_id",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "launch_status_id",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "pad_id",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "image_url",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "rocket_launch_event_id_key",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX rocket_launch_event_id_key ON public.rocket_launch USING btree (event_id)",
                    "primary_key_index": false
                },
                {
                    "name": "rocket_launch_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX rocket_launch_pkey ON public.rocket_launch USING btree (launch_id)",
                    "primary_key_index": true
                }
            ],
            "constraints": [
                {
                    "name": "fk_rocket_launch_event",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (event_id) REFERENCES events(event_id) ON UPDATE CASCADE ON DELETE CASCADE"
                },
                {
                    "name": "fk_rocket_launch_launch_status",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (launch_status_id) REFERENCES launch_statuses(launch_status_id) ON UPDATE CASCADE ON DELETE SET NULL"
                },
                {
                    "name": "fk_rocket_launch_mission",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (mission_id) REFERENCES missions(mission_id) ON UPDATE CASCADE ON DELETE SET NULL"
                },
                {
                    "name": "fk_rocket_launch_pad",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (pad_id) REFERENCES pads(pad_id) ON UPDATE CASCADE ON DELETE SET NULL"
                },
                {
                    "name": "fk_rocket_launch_provider",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (provider_id) REFERENCES providers(provider_id) ON UPDATE CASCADE ON DELETE SET NULL"
                },
                {
                    "name": "fk_rocket_launch_rocket",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (rocket_id) REFERENCES rockets(rocket_id) ON UPDATE CASCADE ON DELETE SET NULL"
                },
                {
                    "name": "rocket_launch_event_id_key",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (event_id)"
                },
                {
                    "name": "rocket_launch_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (launch_id)"
                }
            ],
            "description": null
        },
        {
            "name": "rockets",
            "columns": [
                {
                    "name": "rocket_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "model",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(255)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "manufacture",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "character varying(255)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "description",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "rockets_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX rockets_pkey ON public.rockets USING btree (rocket_id)",
                    "primary_key_index": true
                },
                {
                    "name": "uq_rockets_model_manufacture",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX uq_rockets_model_manufacture ON public.rockets USING btree (model, manufacture)",
                    "primary_key_index": false
                }
            ],
            "constraints": [
                {
                    "name": "rockets_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (rocket_id)"
                },
                {
                    "name": "uq_rockets_model_manufacture",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (model, manufacture)"
                }
            ],
            "description": null
        },
        {
            "name": "user_event_types",
            "columns": [
                {
                    "name": "user_event_type_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "event_type_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "user_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "uq_user_event_types_user_event_type",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX uq_user_event_types_user_event_type ON public.user_event_types USING btree (user_id, event_type_id)",
                    "primary_key_index": false
                },
                {
                    "name": "user_event_types_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX user_event_types_pkey ON public.user_event_types USING btree (user_event_type_id)",
                    "primary_key_index": true
                }
            ],
            "constraints": [
                {
                    "name": "fk_user_event_types_event_type",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (event_type_id) REFERENCES event_types(event_type_id) ON UPDATE CASCADE ON DELETE CASCADE"
                },
                {
                    "name": "fk_user_event_types_user",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE"
                },
                {
                    "name": "uq_user_event_types_user_event_type",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (user_id, event_type_id)"
                },
                {
                    "name": "user_event_types_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (user_event_type_id)"
                }
            ],
            "description": null
        },
        {
            "name": "user_events",
            "columns": [
                {
                    "name": "user_event_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "user_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "event_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "event_comment",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "event_rating",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "uq_user_events_user_event",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX uq_user_events_user_event ON public.user_events USING btree (user_id, event_id)",
                    "primary_key_index": false
                },
                {
                    "name": "user_events_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX user_events_pkey ON public.user_events USING btree (user_event_id)",
                    "primary_key_index": true
                }
            ],
            "constraints": [
                {
                    "name": "chk_user_events_rating",
                    "type": "CHECK",
                    "definition": "CHECK (event_rating IS NULL OR event_rating >= 1 AND event_rating <= 5)"
                },
                {
                    "name": "fk_user_events_event",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (event_id) REFERENCES events(event_id) ON UPDATE CASCADE ON DELETE CASCADE"
                },
                {
                    "name": "fk_user_events_user",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE"
                },
                {
                    "name": "uq_user_events_user_event",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (user_id, event_id)"
                },
                {
                    "name": "user_events_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (user_event_id)"
                }
            ],
            "description": null
        },
        {
            "name": "user_locations",
            "columns": [
                {
                    "name": "user_location_id",
                    "default": null,
                    "identity": "by default",
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "user_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "location_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "bigint",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "uq_user_locations_user_location",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX uq_user_locations_user_location ON public.user_locations USING btree (user_id, location_id)",
                    "primary_key_index": false
                },
                {
                    "name": "user_locations_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX user_locations_pkey ON public.user_locations USING btree (user_location_id)",
                    "primary_key_index": true
                }
            ],
            "constraints": [
                {
                    "name": "fk_user_locations_location",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (location_id) REFERENCES locations(location_id) ON UPDATE CASCADE ON DELETE RESTRICT"
                },
                {
                    "name": "fk_user_locations_user",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE"
                },
                {
                    "name": "uq_user_locations_user_location",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (user_id, location_id)"
                },
                {
                    "name": "user_locations_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (user_location_id)"
                }
            ],
            "description": null
        },
        {
            "name": "user_statuses",
            "columns": [
                {
                    "name": "status_id",
                    "default": null,
                    "identity": "always",
                    "nullable": false,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "status",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(50)",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "user_statuses_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX user_statuses_pkey ON public.user_statuses USING btree (status_id)",
                    "primary_key_index": true
                },
                {
                    "name": "user_statuses_status_key",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX user_statuses_status_key ON public.user_statuses USING btree (status)",
                    "primary_key_index": false
                }
            ],
            "constraints": [
                {
                    "name": "user_statuses_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (status_id)"
                },
                {
                    "name": "user_statuses_status_key",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (status)"
                }
            ],
            "description": null
        },
        {
            "name": "users",
            "columns": [
                {
                    "name": "user_id",
                    "default": null,
                    "identity": "always",
                    "nullable": false,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "email",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(255)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "f_name",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(100)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "l_name",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(100)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "password",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "character varying(255)",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "status_id",
                    "default": null,
                    "identity": null,
                    "nullable": false,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "users_email_key",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)",
                    "primary_key_index": false
                },
                {
                    "name": "users_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX users_pkey ON public.users USING btree (user_id)",
                    "primary_key_index": true
                }
            ],
            "constraints": [
                {
                    "name": "fk_users_status",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (status_id) REFERENCES user_statuses(status_id) ON DELETE RESTRICT"
                },
                {
                    "name": "users_email_key",
                    "type": "UNIQUE",
                    "definition": "UNIQUE (email)"
                },
                {
                    "name": "users_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (user_id)"
                }
            ],
            "description": null
        },
        {
            "name": "weather",
            "columns": [
                {
                    "name": "weather_id",
                    "default": "nextval('weather_weather_id_seq'::regclass)",
                    "identity": null,
                    "nullable": false,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "location_id",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "conditions",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "temp",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "feels_like",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "humidity",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "pressure",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "wind_speed",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "numeric",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "clouds_pct",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "visibility_m",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "integer",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "units",
                    "default": null,
                    "identity": null,
                    "nullable": true,
                    "data_type": "text",
                    "generated": null,
                    "description": null
                },
                {
                    "name": "cached_at",
                    "default": "now()",
                    "identity": null,
                    "nullable": false,
                    "data_type": "timestamp with time zone",
                    "generated": null,
                    "description": null
                }
            ],
            "indexes": [
                {
                    "name": "weather_pkey",
                    "unique": true,
                    "definition": "CREATE UNIQUE INDEX weather_pkey ON public.weather USING btree (weather_id)",
                    "primary_key_index": true
                }
            ],
            "constraints": [
                {
                    "name": "chk_weather_clouds_valid",
                    "type": "CHECK",
                    "definition": "CHECK (clouds_pct IS NULL OR clouds_pct >= 0 AND clouds_pct <= 100)"
                },
                {
                    "name": "chk_weather_humidity_valid",
                    "type": "CHECK",
                    "definition": "CHECK (humidity IS NULL OR humidity >= 0 AND humidity <= 100)"
                },
                {
                    "name": "chk_weather_pressure_nonnegative",
                    "type": "CHECK",
                    "definition": "CHECK (pressure IS NULL OR pressure >= 0)"
                },
                {
                    "name": "chk_weather_visibility_nonnegative",
                    "type": "CHECK",
                    "definition": "CHECK (visibility_m IS NULL OR visibility_m >= 0)"
                },
                {
                    "name": "chk_weather_wind_speed_nonnegative",
                    "type": "CHECK",
                    "definition": "CHECK (wind_speed IS NULL OR wind_speed >= 0::numeric)"
                },
                {
                    "name": "weather_location_id_fkey",
                    "type": "FOREIGN KEY",
                    "definition": "FOREIGN KEY (location_id) REFERENCES locations(location_id) ON DELETE CASCADE"
                },
                {
                    "name": "weather_pkey",
                    "type": "PRIMARY KEY",
                    "definition": "PRIMARY KEY (weather_id)"
                }
            ],
            "description": null
        }
    ],
    "enum_types": [
    ]
}