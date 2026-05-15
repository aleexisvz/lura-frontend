import { apiClient } from "@/lib/apiClient";
import { isRecord, pickString, unwrapArray, unwrapObject } from "@/lib/adapters";
import { Tag, TagScope } from "@/types/domain";

function adaptTag(value: unknown): Tag {
  const source = unwrapObject(value);
  return {
    id: pickString(source, ["id"]),
    scope: pickString(source, ["scope"], "MANGA") as TagScope,
    name: pickString(source, ["name"]),
    slug: pickString(source, ["slug"]),
  };
}

export async function getTags(scope: TagScope) {
  const response = await apiClient.request<unknown>(`/tags?scope=${scope}`);
  return unwrapArray(response).map(adaptTag);
}

export async function createTag(payload: { scope: TagScope; name: string }) {
  const response = await apiClient.request<unknown>("/tags", {
    method: "POST",
    body: payload,
  });

  if (isRecord(response)) {
    return adaptTag(response);
  }

  return adaptTag({});
}
