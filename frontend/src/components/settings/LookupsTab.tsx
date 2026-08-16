import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, ListChecks, Check } from "lucide-react";
import type { LookupItem, LookupCategory } from "@/types";
import { LOOKUP_CATEGORIES } from "@/types";
import api from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLookupsStore } from "@/stores/lookupsStore";

export function LookupsTab() {
  const [category, setCategory] = useState<LookupCategory>("domain");
  const [items, setItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const loadCategory = useCallback(async (cat: LookupCategory) => {
    setLoading(true);
    try {
      const res = await api.get<LookupItem[]>(`/lookups/${cat}`);
      setItems(res.data.sort((a, b) => a.sort_order - b.sort_order));
    } catch {
      setItems([]);
      toast({ title: "Failed to load list", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategory(category);
  }, [category, loadCategory]);

  const refreshPublic = () => {
    useLookupsStore.getState().load(true);
  };

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    try {
      await api.post(`/lookups/${category}`, { category, value: newValue.trim() });
      setNewValue("");
      toast({ title: "Item added", variant: "success" });
      await loadCategory(category);
      refreshPublic();
    } catch (e: any) {
      toast({ title: e?.response?.data?.detail ?? "Could not add item", variant: "destructive" });
    }
  };

  const handleSaveEdit = async (item: LookupItem) => {
    try {
      await api.put(`/lookups/${category}/${item.id}`, { value: editingValue.trim() || item.value });
      setEditingId(null);
      toast({ title: "Item updated", variant: "success" });
      await loadCategory(category);
      refreshPublic();
    } catch (e: any) {
      toast({ title: e?.response?.data?.detail ?? "Could not update", variant: "destructive" });
    }
  };

  const handleToggle = async (item: LookupItem) => {
    try {
      await api.put(`/lookups/${category}/${item.id}`, { is_active: !item.is_active });
      await loadCategory(category);
      refreshPublic();
    } catch (e: any) {
      toast({ title: e?.response?.data?.detail ?? "Could not update item", variant: "destructive" });
    }
  };

  const handleDelete = async (item: LookupItem) => {
    try {
      await api.delete(`/lookups/${category}/${item.id}`);
      toast({ title: "Item deleted", variant: "success" });
      await loadCategory(category);
      refreshPublic();
    } catch (e: any) {
      toast({ title: e?.response?.data?.detail ?? "Could not delete item", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Configurable Lists
        </CardTitle>
        <CardDescription>
          Options shown in the application form, filters and dashboards. Editing these updates
          every form instantly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as LookupCategory)}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOOKUP_CATEGORIES.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {editingId === item.id ? (
                    <Input
                      className="h-8 w-full min-w-0 sm:w-48"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(item)}
                    />
                  ) : (
                    <span className="min-w-0 break-all font-medium">{item.value}</span>
                  )}
                  {!item.is_active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(item)}>
                    {item.is_active ? "Active" : "Activate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (editingId === item.id) handleSaveEdit(item);
                      else {
                        setEditingId(item.id);
                        setEditingValue(item.value);
                      }
                    }}
                  >
                    {editingId === item.id ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new-option">Add option</Label>
            <Input
              id="new-option"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Type a new option value"
            />
          </div>
          <Button onClick={handleAdd} disabled={!newValue.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}