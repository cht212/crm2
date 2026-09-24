<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        if ($request->filled('page')) {
            $paginator = $request->user()
                ->notifications()
                ->latest()
                ->paginate(min(max((int) $request->input('perPage', 10), 1), 50));

            return response()->json([
                'notifications' => $paginator->items(),
                'totalNotifications' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
            ]);
        }

        return response()->json([
            'notifications' => $request->user()->notifications()->latest()->limit(20)->get(),
        ]);
    }

    public function read(Request $request, string $notification)
    {
        $item = $request->user()->notifications()->findOrFail($notification);
        $item->markAsRead();

        return response()->json(['message' => 'Notificación marcada como leída.']);
    }

    public function unread(Request $request, string $notification)
    {
        $item = $request->user()->notifications()->findOrFail($notification);
        $item->markAsUnread();

        return response()->json(['message' => 'Notificación marcada como no leída.']);
    }

    public function destroy(Request $request, string $notification)
    {
        $item = $request->user()->notifications()->findOrFail($notification);
        $item->delete();

        return response()->json(['message' => 'Notificación eliminada.']);
    }
}
