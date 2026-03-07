import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "../trpc.js";

export function useSpaces() {
  const queryClient = useQueryClient();
  const { data, isLoading } = trpc.spaces.list.useQuery(undefined, {
    staleTime: 30_000,
  });

  // Merge habitat events into the cached query data
  trpc.spaces.onEvent.useSubscription(undefined, {
    onData(event) {
      queryClient.setQueryData(
        [["spaces", "list"], { type: "query" }],
        (prev: typeof data) => {
          if (!prev) return prev;
          return {
            ...prev,
            spaces: prev.spaces.map((sp) => {
              if (sp.space !== event.space) return sp;
              return {
                ...sp,
                properties: sp.properties.map((prop) => {
                  if (prop.property !== event.property) return prop;
                  return {
                    ...prop,
                    sources: prop.sources.map((src) => {
                      if (src.source !== event.source) return src;
                      return { ...src, state: { ...src.state, ...event.state } };
                    }),
                  };
                }),
              };
            }),
          };
        },
      );
    },
  });

  const findSource = useCallback(
    (spaceId: string, sourceId?: string) => {
      if (!data) return null;
      const space = data.spaces.find((s) => s.space === spaceId);
      if (!space) return null;
      for (const prop of space.properties) {
        for (const src of prop.sources) {
          if (sourceId ? src.source === sourceId : true) {
            return { ...src, property: prop.property };
          }
        }
      }
      return null;
    },
    [data],
  );

  const findIlluminationSources = useCallback(
    (spaceId: string) => {
      if (!data) return [];
      const space = data.spaces.find((s) => s.space === spaceId);
      if (!space) return [];
      const illumProp = space.properties.find((p) => p.property === "illumination");
      if (!illumProp) return [];
      return illumProp.sources;
    },
    [data],
  );

  const findWeatherSources = useCallback(
    (spaceId: string) => {
      if (!data) return [];
      const space = data.spaces.find((s) => s.space === spaceId);
      if (!space) return [];
      const weatherProp = space.properties.find((p) => p.property === "weather");
      if (!weatherProp) return [];
      return weatherProp.sources;
    },
    [data],
  );

  return { spaces: data, isLoading, findSource, findIlluminationSources, findWeatherSources };
}
