import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalStorage } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const STORAGE_KEY = "qb_saved_addresses";

type AddressEntry = {
  id: string;
  label: string;
  address: string;
  phone?: string;
  isDefault: boolean;
};

export default function SavedAddressesPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [addresses, setAddresses] = useLocalStorage<AddressEntry[]>(STORAGE_KEY, []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (editingId) {
      const entry = addresses.find((item) => item.id === editingId);
      if (entry) {
        setLabel(entry.label);
        setAddress(entry.address);
        setPhone(entry.phone ?? "");
        setIsDefault(entry.isDefault);
      }
    } else {
      setLabel("Home");
      setAddress("");
      setPhone("");
      setIsDefault(false);
    }
  }, [editingId, addresses]);

  if (!isAuthenticated) {
    return (
      <div className="w-full px-4 py-16 text-center">
        <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">Sign in to manage saved addresses</p>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/login")}>Sign In</Button>
      </div>
    );
  }

  function resetForm() {
    setEditingId(null);
    setLabel("Home");
    setAddress("");
    setPhone("");
    setIsDefault(false);
  }

  function handleSave() {
    if (!address.trim()) return;

    const nextAddresses = addresses.map((item) => ({
      ...item,
      isDefault: isDefault ? false : item.isDefault,
    }));

    const payload: AddressEntry = {
      id: editingId ?? crypto.randomUUID(),
      label: label.trim() || "Home",
      address: address.trim(),
      phone: phone.trim() || undefined,
      isDefault,
    };

    setAddresses((current) => {
      const updated = editingId
        ? nextAddresses.map((item) => (item.id === editingId ? payload : item))
        : [...nextAddresses, payload];
      return updated.map((item) => ({
        ...item,
        isDefault: item.id === payload.id ? payload.isDefault : item.isDefault,
      }));
    });

    resetForm();
  }

  function handleDelete(id: string) {
    setAddresses((current) => current.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  }

  function setDefault(id: string) {
    setAddresses((current) => current.map((item) => ({
      ...item,
      isDefault: item.id === id,
    })));
  }

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Saved Addresses</h1>
          <p className="text-sm text-gray-500">Keep delivery addresses handy and choose one in checkout.</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/cart")}>Use in Checkout</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="space-y-4">
          {addresses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
              <MapPin className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-semibold mb-2">No saved addresses yet</p>
              <p className="text-sm">Add your first address here and set it as the default for checkout.</p>
            </div>
          ) : (
            addresses.map((entry) => (
              <div key={entry.id} className="border rounded-3xl p-4 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{entry.label}</p>
                    <p className="text-sm text-gray-500 mt-1">{entry.address}</p>
                    {entry.phone && <p className="text-sm text-gray-400 mt-1">{entry.phone}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    {entry.isDefault && <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">Default</span>}
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(entry.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="text-sm" onClick={() => setDefault(entry.id)}>
                    Set Default
                  </Button>
                  <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate("/cart")}>Use in Cart</Button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="space-y-4">
          <div className="border rounded-3xl p-6 bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Plus className="h-4 w-4 text-orange-500" />
              <h2 className="text-lg font-semibold">{editingId ? "Edit Address" : "New Address"}</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="label">Label</Label>
                <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home, Work, Parents" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div className="flex items-center gap-3">
                <input id="default" type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                <Label htmlFor="default">Set as default delivery address</Label>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleSave}>{editingId ? "Update Address" : "Save Address"}</Button>
                {editingId && (
                  <Button variant="ghost" onClick={resetForm}>Cancel</Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
