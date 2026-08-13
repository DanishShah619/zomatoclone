import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { restaurantService } from "../main";
import { BiLoader, BiMapPin, BiSearch, BiUpload } from "react-icons/bi";
import { LuLocateFixed } from "react-icons/lu";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface props {
  fetchMyRestaurant: () => Promise<void>;
}

const CUISINE_OPTIONS = [
  "Biryani",
  "North Indian",
  "South Indian",
  "Chinese",
  "Fast Food",
  "Pizza",
  "Burger",
  "Rolls",
  "Momos",
  "Desserts",
  "Beverages",
  "Cafe",
  "Bakery",
  "Street Food",
  "Pure Veg",
  "Mughlai",
];

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
      type="button"
      onClick={locateUser}
      className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow hover:bg-gray-100"
    >
      <LuLocateFixed size={16} />
      Use current location
    </button>
  );
};

const AddRestaurant = ({ fetchMyRestaurant }: props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [verifyingTypedAddress, setVerifyingTypedAddress] = useState(false);
  const geocodeRequestId = useRef(0);
  const geocodeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      geocodeAbortRef.current?.abort();
    };
  }, []);

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
      toast.error("Failed to fetch restaurant address");
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
      toast.error("Please enter restaurant address");
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

      setLatitude(Number(match.lat));
      setLongitude(Number(match.lon));
      setFormattedAddress(match.display_name || query);
      setAddressInput(match.display_name || query);
      toast.success("Restaurant address verified on map");
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      toast.error("Failed to verify restaurant address");
    } finally {
      if (requestId === geocodeRequestId.current) {
        setResolvingAddress(false);
        setVerifyingTypedAddress(false);
      }
    }
  };

  const handleSubmit = async () => {
    const cuisineList = Array.from(
      new Set(cuisines.map((cuisine) => cuisine.trim()).filter(Boolean))
    );

    if (
      !name ||
      !image ||
      cuisineList.length === 0 ||
      !formattedAddress ||
      resolvingAddress ||
      latitude === null ||
      longitude === null
    ) {
      alert("All field are required");
      return;
    }

    const formData = new FormData();

    formData.append("name", name);
    formData.append("description", description);
    formData.append("cuisines", JSON.stringify(cuisineList));
    formData.append("latitude", String(latitude));
    formData.append("longitude", String(longitude));
    formData.append("formattedAddress", formattedAddress);
    formData.append("file", image);
    formData.append("phone", phone);

    try {
      setSubmitting(true);
      await axios.post(`${restaurantService}/api/restaurant/new`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success("Restaurant Added successfully");
      fetchMyRestaurant();
    } catch (error: any) {
      toast.error(error.response.data.message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-sm space-y-5">
        <h1 className="text-xl font-semibold">Add Your Restaurant</h1>
        <input
          type="text"
          placeholder="Restaurant name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
        />
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Contact Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
        />
        <textarea
          placeholder="Restaurant Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
        />

        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Cuisines offered</p>
            <p className="mt-1 text-xs text-gray-500">
              Add the food categories customers should see on your restaurant card.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CUISINE_OPTIONS.map((cuisine) => {
              const selected = cuisines.includes(cuisine);

              return (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => {
                    setCuisines((current) =>
                      selected
                        ? current.filter((item) => item !== cuisine)
                        : [...current, cuisine]
                    );
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-[#e23744] bg-[#e23744] text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-700 hover:border-[#e23744]/40 hover:bg-red-50"
                  }`}
                >
                  {cuisine}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
          <BiUpload className="h-5 w-5 text-red-500" />
          {image ? image.name : "Upload restaurant image"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </label>

        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <BiMapPin className="mt-0.5 h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Restaurant address
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Type the address and verify it on the map, or click the map to
                place the restaurant marker.
              </p>
            </div>
          </div>

          <textarea
            rows={3}
            placeholder="Restaurant building, street, area, city, pincode"
            value={addressInput}
            onChange={(e) => {
              setAddressInput(e.target.value);
              setFormattedAddress("");
            }}
            className="w-full resize-none rounded-lg border px-4 py-3 text-sm outline-none focus:border-[#e23744] focus:ring-2 focus:ring-red-100"
          />

          <button
            type="button"
            disabled={verifyingTypedAddress || resolvingAddress}
            onClick={verifyTypedAddress}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#e23744] px-4 py-2.5 text-sm font-semibold text-[#e23744] transition hover:bg-red-50 disabled:opacity-50"
          >
            {verifyingTypedAddress ? (
              <BiLoader className="animate-spin" />
            ) : (
              <BiSearch />
            )}
            Verify on map
          </button>

          <div className="relative h-[320px] overflow-hidden rounded-lg border">
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
              {resolvingAddress
                ? "Verifying restaurant address..."
                : formattedAddress}
            </div>
          )}
        </div>

        <button
          className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-[#e23744]"
          disabled={submitting || resolvingAddress || !formattedAddress}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting..." : "Add Restaurant"}
        </button>
      </div>
    </div>
  );
};

export default AddRestaurant;
