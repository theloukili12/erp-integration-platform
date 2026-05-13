import { getProductionOrders } from "@/lib/api";

type ProductionOrder = {
  id: number;
  order_number: string;
  article: string;
  quantity: number;
  status: string;
};

export default async function Home() {
  const data = await getProductionOrders();
  const orders: ProductionOrder[] = data.items ?? data;

  const totalOrders = orders.length;
  const plannedOrders = orders.filter((order) => order.status === "PLANNED").length;
  const inProgressOrders = orders.filter((order) => order.status === "IN_PROGRESS").length;
  const completedOrders = orders.filter((order) => order.status === "COMPLETED").length;
  const failedOrders = orders.filter((order) => order.status === "FAILED").length;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <section>
        <h1 className="text-3xl font-bold text-gray-900">
          Manufacturing Data Platform
        </h1>
        <p className="mt-2 text-gray-600">
          ERP Integration & Production Order Dashboard
        </p>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-5">
        <KpiCard title="Total Orders" value={totalOrders} />
        <KpiCard title="Planned" value={plannedOrders} />
        <KpiCard title="In Progress" value={inProgressOrders} />
        <KpiCard title="Completed" value={completedOrders} />
        <KpiCard title="Failed" value={failedOrders} />
      </section>

      <section className="mt-10 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Production Orders
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-100 text-left">
                <th className="p-3">Order Number</th>
                <th className="p-3">Article</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b">
                  <td className="p-3 font-medium">{order.order_number}</td>
                  <td className="p-3">{order.article}</td>
                  <td className="p-3">{order.quantity}</td>
                  <td className="p-3">{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function KpiCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}