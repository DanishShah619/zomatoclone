import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { restaurantService } from "../main";
import L from "leaflet";
import { LuLocateFixed } from "react-icons/lu";
import { BiLoader, BiPlus, BiSearch, BiTrash } from "react-icons/bi";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

const LocationPicker = ({
  setLocation,
}: {
  setLocation: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      setLocation(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
};

const LocateMeButton = ({
  onLocate,
}: {
  onLocate: (lat: number, lng: number) => void;
}) => {
  const map = useMap();

  const locateUser = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 16, { animate: true });
        onLocate(latitude, longitude);
      },
      () => toast.error("Location permission denied")
    );
  };

  return (
    <button
      onClick={locateUser}
      className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow hover:bg-gray-100"
    >
      <LuLocateFixed size={16} />
      Use current location
    </button>
  );
};

const MapPositionSync = ({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) => {
  const map = useMap();

  useEffect(() => {
    if (latitude === null || longitude === null) return;
    map.flyTo([latitude, longitude], 16, { animate: true });
  }, [latitude, longitude, map]);

  return null;
};

const AddAddressPage = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mobile, setMobile] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [verifyingTypedAddress, setVerifyingTypedAddress] = useState(false);
  const geocodeRequestId = useRef(0);
  const geocodeAbortRef = useRef<AbortController | null>(null);

  const fetchFormattedAddress = async (lat: number, lng: number) => {
    geocodeAbortRef.current?.abort();

    const requestId = geocodeRequestId.current + 1;
    geocodeRequestId.current = requestId;
    const controller = new AbortController();
    geocodeAbortRef.current = controller;

    try {
      setResolvingAddress(true);
      setFormattedAddress("");

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`,
        { signal: controller.signal }
      );
      const data = await res.json();

      if (requestId !== geocodeRequestId.current) return;

      setFormattedAddress(data.display_name || "");
      setAddressInput(data.display_name || "");
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      toast.error("Failed to fetch address");
    } finally {
      if (requestId === geocodeRequestId.current) {
        setResolvingAddress(false);
      }
    }
  };

  const setLocation = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    fetchFormattedAddress(lat, lng);
  };

  const verifyTypedAddress = async () => {
    const query = addressInput.trim();

    if (!query) {
      toast.error("Please enter an address");
      return;
    }

    geocodeAbortRef.current?.abort();
    const requestId = geocodeRequestId.current + 1;
    geocodeRequestId.current = requestId;
    const controller = new AbortController();
    geocodeAbortRef.current = controller;

    try {
      setVerifyingTypedAddress(true);
      setResolvingAddress(true);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(
          query
        )}`,
        { signal: controller.signal }
      );
      const data = await res.json();

      if (requestId !== geocodeRequestId.current) return;

      const match = data?.[0];
      if (!match?.lat || !match?.lon) {
        toast.error("Could not verify this address on the map");
        setFormattedAddress("");
        setLatitude(null);
        setLongitude(null);
        return;
      }

      const nextLatitude = Number(match.lat);
      const nextLongitude = Number(match.lon);

      setLatitude(nextLatitude);
      setLongitude(nextLongitude);
      setFormattedAddress(match.display_name || query);
      setAddressInput(match.display_name || query);
      toast.success("Address verified on map");
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      toast.error("Failed to verify address");
    } finally {
      if (requestId === geocodeRequestId.current) {
        setResolvingAddress(false);
        setVerifyingTypedAddress(false);
      }
    }
  };

  const fetchAddresses = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/address/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setAddresses(data || []);
    } catch {
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();

    return () => {
      geocodeAbortRef.current?.abort();
    };
  }, []);

  const addAddress = async () => {
    if (
      !mobile ||
      !formattedAddress ||
      resolvingAddress ||
      latitude === null ||
      longitude === null
    ) {
      toast.error(
        resolvingAddress
          ? "Please wait while we confirm your address"
          : "Please select location on map"
      );
      return;
    }

    try {
      setAdding(true);
      await axios.post(
        `${restaurantService}/api/address/new`,
        {
          formattedAddress,
          mobile,
          latitude,
          longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Address added");
      setMobile("");
      setAddressInput("");
      setFormattedAddress("");
      setLatitude(null);
      setLongitude(null);
      fetchAddresses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    } finally {
      setAdding(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!window.confirm("Delete this address?")) return;

    try {
      setDeletingId(id);
      await axios.delete(`${restaurantService}/api/address/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Address deleted");
      fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Select Delivery Address</h1>

      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
        <div>
          <label className="text-sm font-semibold text-gray-800">
            Type delivery address
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Enter your address first, then verify the marker position on the map.
          </p>
        </div>
        <textarea
          rows={3}
          placeholder="House number, street, area, city, pincode"
          value={addressInput}
          onChange={(e) => {
            setAddressInput(e.target.value);
            setFormattedAddress("");
          }}
          className="w-full resize-none rounded-lg border px-4 py-3 text-sm outline-none focus:border-[#E23744] focus:ring-2 focus:ring-red-100"
        />
        <button
          type="button"
          disabled={verifyingTypedAddress || resolvingAddress}
          onClick={verifyTypedAddress}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#E23744] px-4 py-2.5 text-sm font-semibold text-[#E23744] transition hover:bg-red-50 disabled:opacity-50"
        >
          {verifyingTypedAddress ? (
            <BiLoader className="animate-spin" />
          ) : (
            <BiSearch />
          )}
          Verify on map
        </button>
      </div>

      <div className="relative h-[400px] w-full overflow-hidden rounded-lg border">
        <MapContainer
          center={[latitude || 28.6139, longitude || 77.209]}
          zoom={13}
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <LocationPicker setLocation={setLocation} />
          <LocateMeButton onLocate={setLocation} />
          <MapPositionSync latitude={latitude} longitude={longitude} />
          {latitude !== null && longitude !== null && (
            <Marker position={[latitude, longitude]} />
          )}
        </MapContainer>
      </div>

      {(formattedAddress || resolvingAddress) && (
        <div className="rounded-lg border bg-green-50 p-3 text-sm">
          {resolvingAddress ? "Finding address for selected location..." : formattedAddress}
        </div>
      )}

      <input
        type="number"
        placeholder="Mobile number"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        className="w-full rounded-lg border px-4 py-2"
      />

      <button
        disabled={adding || resolvingAddress || !formattedAddress}
        onClick={addAddress}
        className="flex items-center justify-center gap-2 rounded-lg bg-[#E23744] px-4 py-3 text-white hover:bg-[#d32f3a] disabled:opacity-50"
      >
        {adding ? <BiLoader className="animate-spin" /> : <BiPlus />}
        Save Address
      </button>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Saved Addresses</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-gray-500">No addresses saved</p>
        ) : (
          addresses.map((addr) => (
            <div
              key={addr._id}
              className="flex items-center justify-between rounded-lg border bg-white p-3"
            >
              <div>
                <p className="text-sm font-medium">{addr.formattedAddress}</p>
                <p className="text-xs text-gray-500">{addr.mobile}</p>
              </div>
              <button
                onClick={() => deleteAddress(addr._id)}
                disabled={deletingId === addr._id}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingId === addr._id ? (
                  <BiLoader size={16} className="animate-spin" />
                ) : (
                  <BiTrash size={16} />
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AddAddressPage;
