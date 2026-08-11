import { Link, useSearchParams } from "react-router-dom";

const OrderSuccess = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-green-600">
          Payment received
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Your payment is being confirmed securely. Your order will appear as
          soon as Stripe notifies us.
        </p>
        {sessionId && (
          <p className="mt-3 break-all font-mono text-xs text-gray-400">
            {sessionId}
          </p>
        )}
        <Link
          to="/orders"
          className="mt-5 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          View Orders
        </Link>
      </div>
    </div>
  );
};

export default OrderSuccess;
