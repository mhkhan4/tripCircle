import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Calendar } from 'react-native-calendars';
import { useTripTasks, useCreateTask, useCompleteTask, useDeleteTask } from '../../../../../hooks/useTask';
import { useTrip, useTripMembers } from '../../../../../hooks/useTrip';
import { useAppStore } from '../../../../../store/useAppStore';
import type { TaskCategory, TripTask } from '../../../../../types';

const CATEGORIES: { value: TaskCategory; label: string; icon: string; color: string }[] = [
  { value: 'flights', label: 'Flights', icon: 'airplane-outline', color: '#2563EB' },
  { value: 'hotel', label: 'Hotel', icon: 'bed-outline', color: '#7C3AED' },
  { value: 'activities', label: 'Activities', icon: 'bicycle-outline', color: '#10B981' },
  { value: 'transport', label: 'Transport', icon: 'car-outline', color: '#F59E0B' },
  { value: 'packing', label: 'Packing', icon: 'bag-outline', color: '#EF4444' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#64748B' },
];

function catMeta(cat: TaskCategory) {
  return CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[5];
}

export default function TasksScreen() {
  const { id: groupId, tripId } = useLocalSearchParams<{ id: string; tripId: string }>();
  const { user } = useAppStore();
  const { data: tasks, isLoading } = useTripTasks(tripId);
  const { data: trip } = useTrip(tripId);
  const { data: tripMembers } = useTripMembers(tripId);
  const myMembership = tripMembers?.find((m) => m.user_id === user?.id);
  const isTripAdmin = trip?.created_by === user?.id || myMembership?.role === 'admin';
  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('other');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; submit?: string }>({});

  const todo = tasks?.filter((t) => !t.completed_at) ?? [];
  const done = tasks?.filter((t) => !!t.completed_at) ?? [];

  function resetForm() {
    setTitle('');
    setCategory('other');
    setAssignedTo(null);
    setDueDate('');
    setShowCalendar(false);
    setErrors({});
  }

  async function handleCreate() {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = 'Task title is required.';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    try {
      await createTask.mutateAsync({
        trip_id: tripId,
        title: title.trim(),
        category,
        assigned_to: assignedTo,
        due_date: dueDate || null,
      });
      setShowCreate(false);
      resetForm();
    } catch (e: any) {
      setErrors({ submit: e.message });
    }
  }

  async function handleToggle(task: TripTask) {
    try {
      await completeTask.mutateAsync({ task_id: task.id, trip_id: tripId, completed: !task.completed_at });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleDelete(task: TripTask) {
    setConfirmDeleteId(task.id);
  }

  async function confirmDelete() {
    const task = tasks?.find((t) => t.id === confirmDeleteId);
    if (!task) return;
    setConfirmDeleteId(null);
    try {
      await deleteTask.mutateAsync({ task_id: task.id, trip_id: tripId });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  function TaskRow({ task }: { task: TripTask }) {
    const meta = catMeta(task.category);
    const isComplete = !!task.completed_at;
    const canDelete = task.created_by === user?.id || isTripAdmin;

    return (
      <View className={`mb-2 flex-row items-center gap-3 rounded-xl border px-4 py-3 ${isComplete ? 'border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'}`}>
        <TouchableOpacity onPress={() => handleToggle(task)} disabled={completeTask.isPending}>
          <Ionicons
            name={isComplete ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isComplete ? '#10B981' : '#CBD5E1'}
          />
        </TouchableOpacity>

        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${meta.color}15`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={meta.icon as any} size={14} color={meta.color} />
        </View>

        <View className="flex-1">
          <Text className={`font-medium ${isComplete ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{task.title}</Text>
          <View className="mt-0.5 flex-row items-center gap-2">
            {task.assignee && (
              <Text className="text-xs text-gray-400">{task.assignee.full_name}</Text>
            )}
            {task.due_date && (
              <Text className="text-xs text-gray-400">Due {format(new Date(task.due_date + 'T12:00:00'), 'MMM d')}</Text>
            )}
          </View>
        </View>

        {canDelete && (
          <TouchableOpacity onPress={() => handleDelete(task)} className="p-1">
            <Ionicons name="close-circle-outline" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Tasks' }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {tasks?.length === 0 && (
            <View className="items-center py-16">
              <Ionicons name="checkbox-outline" size={48} color="#CBD5E1" />
              <Text className="mt-3 text-base font-semibold text-gray-400">No tasks yet</Text>
              <Text className="mt-1 text-sm text-gray-400">Assign planning tasks to keep everyone accountable.</Text>
            </View>
          )}

          {/* Progress bar */}
          {(tasks?.length ?? 0) > 0 && (
            <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">Progress</Text>
                <Text className="text-sm font-bold text-primary">{done.length}/{tasks?.length} done</Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <View
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${tasks?.length ? (done.length / tasks.length) * 100 : 0}%` }}
                />
              </View>
            </View>
          )}

          {todo.length > 0 && (
            <>
              <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">To Do · {todo.length}</Text>
              {todo.map((t) => <TaskRow key={t.id} task={t} />)}
            </>
          )}

          {done.length > 0 && (
            <>
              <Text className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-gray-400">Done · {done.length}</Text>
              {done.map((t) => <TaskRow key={t.id} task={t} />)}
            </>
          )}
        </ScrollView>
      )}

      <View className="absolute bottom-6 right-5">
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          className="flex-row items-center gap-2 rounded-2xl bg-primary px-5 py-3 shadow-lg"
          style={{ shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="font-bold text-white">Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Delete confirmation modal */}
      <Modal visible={!!confirmDeleteId} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-2xl bg-white p-6 dark:bg-gray-900">
            <Text className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Delete task?</Text>
            <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400">This task will be permanently removed.</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-xl border border-gray-200 py-3 items-center dark:border-gray-700"
              >
                <Text className="font-semibold text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDelete}
                disabled={deleteTask.isPending}
                className="flex-1 rounded-xl bg-red-500 py-3 items-center"
              >
                {deleteTask.isPending
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text className="font-bold text-white">Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create task modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="flex-1 justify-end">
            <View className="rounded-t-3xl bg-white px-5 pb-10 pt-5 dark:bg-gray-900" style={{ maxHeight: '85%' }}>
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">New Task</Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput
                  value={title}
                  onChangeText={(v) => { setTitle(v); if (errors.title) setErrors((e) => ({ ...e, title: undefined })); }}
                  placeholder="Task title"
                  placeholderTextColor="#94A3B8"
                  className={`rounded-xl border bg-slate-50 px-4 py-3 text-gray-900 dark:bg-gray-800 dark:text-white ${errors.title ? 'mb-1 border-red-500' : 'mb-4 border-gray-200 dark:border-gray-700'}`}
                />
                {!!errors.title && <Text className="mb-3 text-xs text-red-500">{errors.title}</Text>}

                <Text className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Category</Text>
                <View className="mb-4 flex-row flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c.value}
                      onPress={() => setCategory(c.value)}
                      className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${category === c.value ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-700'}`}
                    >
                      <Ionicons name={c.icon as any} size={13} color={category === c.value ? 'white' : '#64748B'} />
                      <Text className={`text-sm font-semibold ${category === c.value ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {tripMembers && tripMembers.length > 0 && (
                  <>
                    <Text className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Assign to</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => setAssignedTo(null)}
                          className={`rounded-full px-3 py-1.5 ${!assignedTo ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-700'}`}
                        >
                          <Text className={`text-sm font-semibold ${!assignedTo ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>Unassigned</Text>
                        </TouchableOpacity>
                        {tripMembers.map((m) => (
                          <TouchableOpacity
                            key={m.user_id}
                            onPress={() => setAssignedTo(m.user_id)}
                            className={`rounded-full px-3 py-1.5 ${assignedTo === m.user_id ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-700'}`}
                          >
                            <Text className={`text-sm font-semibold ${assignedTo === m.user_id ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                              {m.user?.full_name?.split(' ')[0] ?? 'Member'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </>
                )}

                <Text className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Due date (optional)</Text>
                <TouchableOpacity
                  onPress={() => setShowCalendar(!showCalendar)}
                  className="mb-2 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                  <Text className={dueDate ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-400'}>
                    {dueDate ? format(new Date(dueDate + 'T12:00:00'), 'MMM d, yyyy') : 'No due date'}
                  </Text>
                  {!!dueDate && (
                    <TouchableOpacity onPress={() => setDueDate('')} className="ml-auto">
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {showCalendar && (
                  <View className="mb-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                    <Calendar
                      onDayPress={(day: { dateString: string }) => { setDueDate(day.dateString); setShowCalendar(false); }}
                      markedDates={dueDate ? { [dueDate]: { selected: true, selectedColor: '#2563EB' } } : {}}
                      minDate={new Date().toISOString().split('T')[0]}
                    />
                  </View>
                )}

              </ScrollView>

              {!!errors.submit && <Text className="mb-2 text-center text-xs text-red-500">{errors.submit}</Text>}
              <TouchableOpacity
                onPress={handleCreate}
                disabled={createTask.isPending}
                className="mt-1 items-center rounded-2xl bg-primary py-4"
              >
                {createTask.isPending
                  ? <ActivityIndicator color="white" />
                  : <Text className="font-bold text-white">Add Task</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
